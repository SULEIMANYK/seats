import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const REASONS = ["spam", "scam", "broken", "nsfw", "other"] as const;
type Reason = (typeof REASONS)[number];

function isValidReason(value: unknown): value is Reason {
  return typeof value === "string" && (REASONS as readonly string[]).includes(value);
}

/** Same hash as the click redirect: sha256(ip + salt), so the raw IP is never stored. */
function hashIp(ip: string) {
  return createHash("sha256")
    .update(ip + (process.env.CLICK_SALT ?? "seats.lol"))
    .digest("hex")
    .slice(0, 32);
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

/**
 * Flag a listing as spam, a scam, broken, or worse.
 *
 * Deliberately open to anyone, signed in or not — requiring an account first
 * is friction a scam listing would happily hide behind. The only guards are
 * a hashed-IP rate limit (the same technique clicks already use) and one
 * report per listing per IP, enforced by a unique index rather than trusted
 * to application logic.
 */
export async function POST(request: Request) {
  let body: { listingId?: string; reason?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const listingId = body.listingId?.trim();
  if (!listingId) {
    return NextResponse.json({ error: "Missing listing" }, { status: 400 });
  }
  if (!isValidReason(body.reason)) {
    return NextResponse.json({ error: "Pick a reason" }, { status: 400 });
  }
  const note = body.note?.trim().slice(0, 500) || null;

  const supabase = db();

  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIp(ip);

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Too many reports from this connection — try again later." },
      { status: 429 },
    );
  }

  const { error } = await supabase.from("reports").insert({
    listing_id: listingId,
    reason: body.reason,
    note,
    reporter_ip_hash: ipHash,
  });

  if (error) {
    // Unique violation on (listing_id, reporter_ip_hash): already reported.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You've already reported this one." },
        { status: 409 },
      );
    }
    console.error("report insert failed", error);
    return NextResponse.json({ error: "Could not submit report" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
