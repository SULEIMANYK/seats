import { NextResponse } from "next/server";
import { authoriseListing } from "@/lib/listing-auth";
import { db } from "@/lib/db";
import { MIN_INCREMENT_CENTS, OPENING_BID_CENTS } from "@/lib/bidding";
import { createBidCheckout } from "@/lib/dodo";
import { SITE } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Place a bid.
 *
 * Nothing changes here. This opens a checkout for the amount and returns the
 * link; the rank moves only when the webhook confirms the money arrived.
 * Anything else would let anyone reach the top by posting JSON.
 *
 * The amount is re-checked against the live board at confirmation time too,
 * because a board that moves while someone is at the checkout page is normal
 * rather than exceptional.
 */
export async function POST(request: Request) {
  let body: { token?: string; amountCents?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listing, supabase } = await authoriseListing(body.token);
  if (!listing) {
    return NextResponse.json({ error: "Not yours, or no longer there." }, { status: 404 });
  }

  const amount = Number(body.amountCents);
  if (!Number.isInteger(amount) || amount < OPENING_BID_CENTS) {
    return NextResponse.json(
      { error: `The smallest bid is $${OPENING_BID_CENTS / 100}.` },
      { status: 400 },
    );
  }
  // A bid large enough to be a typo is refused rather than charged.
  if (amount > 100_000_00) {
    return NextResponse.json({ error: "That is above the maximum bid." }, { status: 400 });
  }

  // Must beat what this listing already holds, or it is money for nothing.
  if (amount < listing.bid_cents + MIN_INCREMENT_CENTS) {
    return NextResponse.json(
      { error: `You already hold this at $${listing.bid_cents / 100}. Bid higher.` },
      { status: 409 },
    );
  }

  const result = await createBidCheckout({
    listingId: listing.id,
    domain: listing.domain,
    amountCents: amount,
    returnUrl: `https://${SITE.domain}/manage/${listing.manage_token}?bid=pending`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url });
}

/** What it currently costs to take each of the top ranks. */
export async function GET() {
  const { data, error } = await db()
    .from("leaderboard")
    .select("rank, name, bid_cents")
    .order("rank")
    .limit(50);

  if (error) {
    console.error("bid prices failed", error);
    return NextResponse.json({ error: "Could not read the board" }, { status: 500 });
  }

  return NextResponse.json(
    { ranks: data ?? [] },
    { headers: { "cache-control": "no-store" } },
  );
}
