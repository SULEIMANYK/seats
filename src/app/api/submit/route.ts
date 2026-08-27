import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { isValidCategory } from "@/lib/categories";
import { isValidPricingModel } from "@/lib/pricing";
import { db } from "@/lib/db";
import { BOARD_SIZE } from "@/lib/seating";
import { canonicalDomain, makeSlug, normalizeImageUrl, normalizeUrl } from "@/lib/slug";

export const runtime = "nodejs";

/**
 * Claim a seat. Free, and no account.
 *
 * Nothing is charged and nobody signs in, so the checks that remain do all
 * the work: one listing per domain, a real http(s) URL, and a per-IP
 * rate limit. The domain rule is the load-bearing one -- taking N ranks means
 * owning N domains, and domains cost money in a way email addresses do not.
 *
 * The manage token returned here is the only credential. It is what edits,
 * moves and removes the listing, and what claims a seat again tomorrow.
 */

type Body = {
  name?: string;
  url?: string;
  tagline?: string;
  email?: string;
  category?: string;
  logoUrl?: string;
  imageUrl?: string;
  description?: string;
  pricingModel?: string;
  docsUrl?: string;
  seat?: number;
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
  // Optional, and only so a lost manage link can be sent again. Nothing is
  // gated on it and it is never required.
  const email = body.email?.trim().slice(0, 200) || null;
  const url = body.url ? normalizeUrl(body.url) : null;
  const category = isValidCategory(body.category) ? body.category : null;
  // Both optional. A bad value is dropped rather than refused — a broken
  // image link should not stop someone getting on the board.
  const logoUrl = normalizeImageUrl(body.logoUrl);
  const imageUrl = normalizeImageUrl(body.imageUrl);
  const description = body.description?.trim().slice(0, 600) || null;
  const pricingModel = isValidPricingModel(body.pricingModel) ? body.pricingModel : null;

  // A second link, stored in the same shape as any other extra link.
  const docs = body.docsUrl ? normalizeUrl(body.docsUrl) : null;
  const extraLinks = docs ? [{ label: "Docs", url: docs }] : [];

  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Name is required (max 60 characters)" }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "A valid http(s) URL is required" }, { status: 400 });
  }
  if (!tagline || tagline.length > 160) {
    return NextResponse.json({ error: "Tagline is required (max 160 characters)" }, { status: 400 });
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

  const today = new Date().toISOString().slice(0, 10);

  if (await overRateLimit(supabase, ipHash)) {
    return NextResponse.json(
      { error: "That's a few listings in a short time. Try again later." },
      { status: 429 },
    );
  }

  // One listing per company, matched on domain so acme.com/a and acme.com/b
  // cannot quietly hold two ranks. Not scoped to a day any more -- the board
  // no longer empties, so "already listed" means listed, full stop.
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("domain", domain)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That domain is already listed." },
      { status: 409 },
    );
  }

  // The seat picked on the chart, if any. Anything outside the house or
  // already taken is refused rather than quietly reassigned — being moved
  // without being told is what made the old behaviour feel broken.
  const wanted = Number(body.seat);
  const picked = Number.isInteger(wanted) && wanted >= 1 && wanted <= BOARD_SIZE ? wanted : null;

  if (picked !== null) {
    const { data: held } = await supabase
      .from("listings")
      .select("id")
      .eq("seat", picked)
      .eq("seat_day", today)
      .in("status", ["active", "past_due"])
      .maybeSingle();

    if (held) {
      return NextResponse.json(
        { error: `Seat ${picked} was taken. Pick another.`, seatTaken: picked },
        { status: 409 },
      );
    }
  }

  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("seat_day", today)
    .in("status", ["active", "past_due"]);

  if ((count ?? 0) >= BOARD_SIZE) {
    return NextResponse.json(
      { error: "Every seat is taken right now. Check back when one frees up." },
      { status: 409 },
    );
  }

  // No pick means the lowest free seat, so the house fills from the front.
  let seat = picked;
  if (seat === null) {
    const { data: taken } = await supabase
      .from("listings")
      .select("seat")
      .eq("seat_day", today)
      .in("status", ["active", "past_due"])
      .not("seat", "is", null)
      .returns<{ seat: number }[]>();

    const used = new Set((taken ?? []).map((t) => t.seat));
    for (let n = 1; n <= BOARD_SIZE; n++) {
      if (!used.has(n)) { seat = n; break; }
    }
    if (seat === null) {
      return NextResponse.json({ error: "Every seat is taken." }, { status: 409 });
    }
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
      logo_url: logoUrl,
      image_url: imageUrl,
      description,
      pricing_model: pricingModel,
      extra_links: extraLinks,
      seat,
      seat_day: today,
      submit_ip_hash: ipHash,
      // Nothing to wait for, so the listing goes up immediately.
      status: "active",
      tier_since: new Date().toISOString(),
    })
    .select("slug, manage_token")
    .single();

  if (error || !listing) {
    // 23505 is the unique violation on the seat index: someone claimed it in
    // the moment between the check above and this insert.
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: `Seat ${seat} was claimed a moment ago. Pick another.`, seatTaken: seat },
        { status: 409 },
      );
    }
    console.error("listing insert failed", error);
    return NextResponse.json({ error: "Could not create listing" }, { status: 500 });
  }

  // Surface anything that was thrown away, so a mistyped logo is visible
  // rather than mysteriously absent from the seat.
  const dropped: string[] = [];
  if (body.logoUrl?.trim() && !logoUrl) dropped.push("logo");
  if (body.imageUrl?.trim() && !imageUrl) dropped.push("screenshot");

  return NextResponse.json({
    slug: listing.slug,
    manageToken: listing.manage_token,
    seat,
    ...(dropped.length && { warning: `Couldn't read your ${dropped.join(" or ")} URL, so it was left off.` }),
  });
}
