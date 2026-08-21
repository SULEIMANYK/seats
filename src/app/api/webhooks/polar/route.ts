import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { db } from "@/lib/db";
import { centsForProductId } from "@/lib/tiers";

export const runtime = "nodejs";

/**
 * Polar is the source of truth for who is paying. The board only ever changes
 * in response to a verified event from here (or a climb, which is itself
 * confirmed by the event that follows it).
 */
export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("POLAR_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event;
  try {
    event = validateEvent(body, headers, secret);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    throw err;
  }

  const supabase = db();

  switch (event.type) {
    // Paid and live. This is the only event that puts a listing on the board.
    case "subscription.active": {
      const sub = event.data;
      const listingId = sub.metadata?.listing_id as string | undefined;
      const cents = centsForProductId(sub.productId) ?? Number(sub.metadata?.price_cents);

      if (!listingId || !Number.isFinite(cents)) {
        console.error("subscription.active without usable metadata", sub.id);
        break;
      }

      const { data: rank, error } = await supabase.rpc("activate_listing", {
        p_listing_id: listingId,
        p_price_cents: cents,
        p_subscription_id: sub.id,
        p_customer_id: sub.customerId,
        p_product_id: sub.productId,
      });

      if (error) {
        console.error("activate_listing failed", error);
        return NextResponse.json({ error: "Activation failed" }, { status: 500 });
      }

      await supabase.from("rank_events").insert({
        listing_id: listingId,
        kind: "joined",
        to_cents: cents,
      });

      console.log(`listing ${listingId} activated at rank ${rank}`);
      break;
    }

    // Price changed on Polar's side (including our own climb calls). Keep the
    // board in sync with whatever product the subscription actually holds.
    case "subscription.updated": {
      const sub = event.data;
      const cents = centsForProductId(sub.productId);
      if (cents === null) break;

      const { data: current } = await supabase
        .from("listings")
        .select("price_cents")
        .eq("polar_subscription_id", sub.id)
        .maybeSingle();

      // tier_since only moves when the price actually moves, so the tie-break
      // keeps rewarding whoever has held the price longest.
      if (current && current.price_cents !== cents) {
        await supabase
          .from("listings")
          .update({ price_cents: cents, tier_since: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("polar_subscription_id", sub.id);
      }
      break;
    }

    // Card failing. Stay on the board with a visible badge — public pressure
    // collects better than a dunning email.
    case "subscription.past_due": {
      await supabase
        .from("listings")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("polar_subscription_id", event.data.id);
      break;
    }

    // Cancelled, but paid through the end of the period — they keep the slot
    // until it actually lapses.
    case "subscription.canceled": {
      await supabase
        .from("listings")
        .update({ cancel_scheduled: true, updated_at: new Date().toISOString() })
        .eq("polar_subscription_id", event.data.id);
      break;
    }

    case "subscription.uncanceled": {
      await supabase
        .from("listings")
        .update({ cancel_scheduled: false, status: "active", updated_at: new Date().toISOString() })
        .eq("polar_subscription_id", event.data.id);
      break;
    }

    // Access actually ended. The slot is free.
    case "subscription.revoked": {
      const { data: listing } = await supabase
        .from("listings")
        .select("id, price_cents")
        .eq("polar_subscription_id", event.data.id)
        .maybeSingle();

      if (listing) {
        await supabase
          .from("listings")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("id", listing.id);

        await supabase.from("rank_events").insert({
          listing_id: listing.id,
          kind: "canceled",
          from_cents: listing.price_cents,
        });
      }
      break;
    }

    // A recovered payment after past_due.
    case "order.paid": {
      const subId = event.data.subscriptionId;
      if (!subId) break;

      await supabase
        .from("listings")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("polar_subscription_id", subId)
        .eq("status", "past_due");
      break;
    }
  }

  return NextResponse.json({ received: true });
}
