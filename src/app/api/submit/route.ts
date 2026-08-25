import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { isValidCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { BOARD_SIZE } from "@/lib/seating";
import { canonicalDomain, makeSlug, normalizeUrl } from "@/lib/slug";

export const runtime = "nodejs";

/**
 * Claim a seat. Free — there is no payment step.
 *
 * Because nothing is charged, the usual filter against junk is gone, so the
 * checks that remain do more work: one listing per domain, a real http(s)
 * URL, and a per-IP rate limit. None of that stops a determined spammer, so
 * a listing can be pulled with its manage token and the board is capped.
 */

type Body = {
  name?: string;
  url?: string;
  tagline?: string;
  email?: string;
  category?: string;
};

/** Recent submissions per hashed IP, to blunt scripted signups. */
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 3;

async function overRateLimit(supabase: ReturnType<typeof db>, ipHash: string) {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("submit_ip_hash", ipHash)
    .gte("created_at", since);
  return (count ?? 0) >= RATE_LIMIT;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const tagline = body.tagline?.trim();
  const email = body.email?.trim().toLowerCase();
  const url = body.url ? normalizeUrl(body.url) : null;
  const category = isValidCategory(body.category) ? body.category : null;

  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Name is required (max 60 characters)" }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "A valid http(s) URL is required" }, { status: 400 });
  }
  if (!tagline || tagline.length > 160) {
    return NextResponse.json({ error: "Tagline is required (max 160 characters)" }, { status: 400 });
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const domain = canonicalDomain(url);
  if (!domain) {
    return NextResponse.json({ error: "A valid http(s) URL is required" }, { status: 400 });
  }

  const supabase = db();

  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256")
    .update(ip + (process.env.CLICK_SALT ?? "seats.lol"))
    .digest("hex")
    .slice(0, 32);

  if (await overRateLimit(supabase, ipHash)) {
    return NextResponse.json(
      { error: "That's a few listings in a short time. Try again later." },
      { status: 429 },
    );
  }

  // One seat per company, matched on domain so acme.com/a and acme.com/b
  // cannot quietly hold two.
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("domain", domain)
    .in("status", ["active", "past_due", "grace"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That domain is already on the board." },
      { status: 409 },
    );
  }

  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "past_due"]);

  if ((count ?? 0) >= BOARD_SIZE) {
    return NextResponse.json(
      { error: "Every seat is taken right now. Check back when one frees up." },
      { status: 409 },
    );
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      slug: makeSlug(name),
      name,
      url,
      domain,
      tagline,
      email,
      category,
      submit_ip_hash: ipHash,
      price_cents: 0,
      // Nothing to wait for, so the listing goes up immediately.
      status: "active",
      tier_since: new Date().toISOString(),
    })
    .select("slug, manage_token")
    .single();

  if (error || !listing) {
    console.error("listing insert failed", error);
    return NextResponse.json({ error: "Could not create listing" }, { status: 500 });
  }

  return NextResponse.json({ slug: listing.slug, manageToken: listing.manage_token });
}
