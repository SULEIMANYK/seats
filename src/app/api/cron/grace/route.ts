import { NextResponse } from "next/server";
import { db, type Listing } from "@/lib/db";
import { polar } from "@/lib/polar";

export const runtime = "nodejs";

/**
 * Runs daily. Handles both halves of the grace period:
 *
 *  1. Listings just pushed off the board still have a live subscription —
 *     stop the next charge immediately, so nobody pays for a slot they lost.
 *  2. Listings whose 7 days ran out are revoked for good.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = db();
  const now = new Date().toISOString();
  let stopped = 0;
  let revoked = 0;

  // 1. Newly bumped — schedule cancellation so billing stops at period end.
  const { data: bumped } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "grace")
    .eq("cancel_scheduled", false)
    .returns<Listing[]>();

  for (const listing of bumped ?? []) {
    if (!listing.polar_subscription_id) continue;
    try {
      await polar().subscriptions.update({
        id: listing.polar_subscription_id,
        subscriptionUpdate: { cancelAtPeriodEnd: true },
      });
      await supabase
        .from("listings")
        .update({ cancel_scheduled: true, updated_at: now })
        .eq("id", listing.id);
      await supabase.from("rank_events").insert({
        listing_id: listing.id,
        kind: "bumped",
        from_cents: listing.price_cents,
      });
      stopped++;
    } catch (err) {
      console.error(`could not schedule cancellation for ${listing.id}`, err);
    }
  }

  // 2. Grace expired — end it.
  const { data: expired } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "grace")
    .lt("grace_until", now)
    .returns<Listing[]>();

  for (const listing of expired ?? []) {
    try {
      if (listing.polar_subscription_id) {
        await polar().subscriptions.revoke({ id: listing.polar_subscription_id });
      }
      await supabase
        .from("listings")
        .update({ status: "canceled", updated_at: now })
        .eq("id", listing.id);
      revoked++;
    } catch (err) {
      console.error(`could not revoke ${listing.id}`, err);
    }
  }

  return NextResponse.json({ stopped, revoked });
}
