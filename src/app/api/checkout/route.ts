import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { polar, siteUrl } from "@/lib/polar";
import { makeSlug, normalizeUrl } from "@/lib/slug";
import { BOARD_SIZE, isValidTier, productIdForCents } from "@/lib/tiers";

export const runtime = "nodejs";

type Body = {
  name?: string;
  url?: string;
  tagline?: string;
  email?: string;
  cents?: number;
};

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
  const cents = Number(body.cents);
  const url = body.url ? normalizeUrl(body.url) : null;

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
  if (!isValidTier(cents)) {
    return NextResponse.json({ error: "Pick one of the listed prices" }, { status: 400 });
  }

  const supabase = db();

  // The same URL can't hold two slots — that would just be buying extra space.
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("url", url)
    .in("status", ["active", "past_due", "grace"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That URL is already on the board. Use your manage link to change price." },
      { status: 409 },
    );
  }

  // When the board is full, getting on means clearing the price at #100.
  // This is the ratchet: every new listing raises the bar for the next one.
  const { data: cut } = await supabase
    .from("board")
    .select("price_cents, rank")
    .eq("rank", BOARD_SIZE)
    .maybeSingle();

  if (cut && cents <= cut.price_cents) {
    return NextResponse.json(
      {
        error: `The board is full. You need to beat #${BOARD_SIZE} to get on.`,
        minimumCents: cut.price_cents,
      },
      { status: 409 },
    );
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      slug: makeSlug(name),
      name,
      url,
      tagline,
      email,
      price_cents: cents,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !listing) {
    return NextResponse.json({ error: "Could not create listing" }, { status: 500 });
  }

  try {
    const checkout = await polar().checkouts.create({
      products: [productIdForCents(cents)],
      customerEmail: email,
      successUrl: `${siteUrl()}/success?checkout_id={CHECKOUT_ID}`,
      // The webhook reads this to know which listing just went live.
      metadata: { listing_id: listing.id, price_cents: cents },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    // Don't leave an orphaned pending row behind if Polar rejected us.
    await supabase.from("listings").delete().eq("id", listing.id);
    console.error("polar checkout failed", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
