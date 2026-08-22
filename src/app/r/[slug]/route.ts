import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { atLeast, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Outbound click tracker. Every listing links through here so we can show each
 * one what it actually got for its money — the number that decides whether
 * they renew next month.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = db();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, url, status, plan")
    .eq("slug", slug)
    .maybeSingle<{ id: string; url: string; status: string; plan: PlanId }>();

  if (!listing || listing.status === "canceled") {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // Which tagline was on screen, so an A/B test can be scored.
  const variantParam = new URL(request.url).searchParams.get("v");
  const variant = variantParam === "a" || variantParam === "b" ? variantParam : null;

  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";

  // Hashed with a server-side salt so the raw IP is never stored.
  const ipHash = createHash("sha256")
    .update(ip + (process.env.CLICK_SALT ?? "seats.lol"))
    .digest("hex")
    .slice(0, 32);

  // Fire and forget — a slow insert should never delay the redirect.
  void supabase
    .from("clicks")
    .insert({
      listing_id: listing.id,
      variant,
      ip_hash: ipHash,
      referer: request.headers.get("referer")?.slice(0, 500) ?? null,
      ua: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("click insert failed", error);
    });

  // Pro and above get UTM tagging, so the click lands in the subscriber's own
  // analytics rather than appearing as anonymous referral traffic.
  let target = listing.url;
  if (atLeast(listing.plan, "pro")) {
    try {
      const url = new URL(listing.url);
      if (!url.searchParams.has("utm_source")) {
        url.searchParams.set("utm_source", "seats.lol");
        url.searchParams.set("utm_medium", "referral");
        url.searchParams.set("utm_campaign", "leaderboard");
      }
      target = url.toString();
    } catch {
      // Malformed stored URL: send them to it unmodified rather than fail.
    }
  }

  return NextResponse.redirect(target, 302);
}
