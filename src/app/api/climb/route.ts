import { NextResponse } from "next/server";
import { db, type Listing } from "@/lib/db";
import { polar } from "@/lib/polar";
import { BOARD_SIZE, isValidTier, productIdForCents } from "@/lib/tiers";

export const runtime = "nodejs";

/**
 * Raise a listing's monthly price, which moves it up the board.
 *
 * Polar swaps the product with `prorationBehavior: "invoice"`, so the customer
 * is charged the difference right away and the new rank is live within seconds —
 * while the impulse that made them click is still there.
 */
export async function POST(request: Request) {
  let body: { token?: string; cents?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  const cents = Number(body.cents);

  if (!token) return NextResponse.json({ error: "Missing manage token" }, { status: 400 });
  if (!isValidTier(cents)) {
    return NextResponse.json({ error: "Pick one of the listed prices" }, { status: 400 });
  }

  const supabase = db();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle<Listing>();

  if (!listing) return NextResponse.json({ error: "Unknown manage link" }, { status: 404 });
  if (!listing.polar_subscription_id) {
    return NextResponse.json({ error: "This listing has no active subscription" }, { status: 409 });
  }
  if (listing.status === "canceled") {
    return NextResponse.json(
      { error: "This listing was canceled — start a new one to rejoin." },
      { status: 409 },
    );
  }
  if (cents <= listing.price_cents) {
    return NextResponse.json(
      { error: "Price can only go up mid-cycle. Lower it at renewal instead." },
      { status: 400 },
    );
  }

  // A listing climbing back out of grace has to clear the current cut, same as
  // anyone new — otherwise grace would be a cheaper way onto a full board.
  if (listing.status === "grace") {
    const { data: cut } = await supabase
      .from("board")
      .select("price_cents")
      .eq("rank", BOARD_SIZE)
      .maybeSingle();

    if (cut && cents <= cut.price_cents) {
      return NextResponse.json(
        { error: `The board is full — you need to beat #${BOARD_SIZE} to come back.` },
        { status: 409 },
      );
    }
  }

  const productId = productIdForCents(cents);

  try {
    // Getting bumped schedules a cancellation; climbing back has to undo it
    // before the product swap, since Polar takes one change per call.
    if (listing.cancel_scheduled) {
      await polar().subscriptions.update({
        id: listing.polar_subscription_id,
        subscriptionUpdate: { cancelAtPeriodEnd: false },
      });
    }

    await polar().subscriptions.update({
      id: listing.polar_subscription_id,
      subscriptionUpdate: { productId, prorationBehavior: "invoice" },
    });
  } catch (err) {
    console.error("polar subscription update failed", err);
    return NextResponse.json({ error: "Payment provider rejected the change" }, { status: 502 });
  }

  // Reuse the same atomic path as a fresh activation so the 100-slot cap is
  // enforced identically whether someone joins or climbs.
  const { data: rank, error } = await supabase.rpc("activate_listing", {
    p_listing_id: listing.id,
    p_price_cents: cents,
    p_subscription_id: listing.polar_subscription_id,
    p_customer_id: listing.polar_customer_id,
    p_product_id: productId,
  });

  if (error) {
    console.error("activate_listing failed after successful payment", error);
    return NextResponse.json({ error: "Charged, but the board didn't update. Contact us." }, { status: 500 });
  }

  await supabase.from("listings").update({ cancel_scheduled: false }).eq("id", listing.id);
  await supabase.from("rank_events").insert({
    listing_id: listing.id,
    kind: "climbed",
    from_cents: listing.price_cents,
    to_cents: cents,
  });

  return NextResponse.json({ rank });
}
