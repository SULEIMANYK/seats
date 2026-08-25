import { NextResponse } from "next/server";
import { isValidCategory } from "@/lib/categories";
import { authoriseListing } from "@/lib/listing-auth";
import { isValidPricingModel } from "@/lib/pricing";
import { normalizeImageUrl, normalizeUrl } from "@/lib/slug";

export const runtime = "nodejs";

/**
 * Edit or remove a listing.
 *
 * The URL is deliberately not editable. Changing it would let someone claim a
 * seat with one product and swap in another after the fact, which is the
 * whole thing the domain rule exists to prevent.
 *
 * Moving between free seats lives in ./seat.
 */
export async function PATCH(request: Request) {
  let body: Record<string, string | undefined>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listing, supabase } = await authoriseListing(body.token, body.listingId);
  if (!listing) {
    return NextResponse.json({ error: "Not yours, or no longer there." }, { status: 404 });
  }

  const name = body.name?.trim();
  const tagline = body.tagline?.trim();

  if (name !== undefined && (!name || name.length > 60)) {
    return NextResponse.json({ error: "Name is required (max 60 characters)" }, { status: 400 });
  }
  if (tagline !== undefined && (!tagline || tagline.length > 160)) {
    return NextResponse.json({ error: "Tagline is required (max 160 characters)" }, { status: 400 });
  }

  const docs = body.docsUrl?.trim() ? normalizeUrl(body.docsUrl) : null;

  const { error } = await supabase
    .from("listings")
    .update({
      ...(name !== undefined && { name }),
      ...(tagline !== undefined && { tagline }),
      description: body.description?.trim().slice(0, 600) || null,
      category: isValidCategory(body.category) ? body.category : null,
      pricing_model: isValidPricingModel(body.pricingModel) ? body.pricingModel : null,
      logo_url: normalizeImageUrl(body.logoUrl),
      image_url: normalizeImageUrl(body.imageUrl),
      extra_links: docs ? [{ label: "Docs", url: docs }] : [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", listing.id);

  if (error) {
    console.error("listing update failed", error);
    return NextResponse.json({ error: "Could not save changes" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  let body: { token?: string; listingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listing, supabase } = await authoriseListing(body.token, body.listingId);
  if (!listing) {
    return NextResponse.json({ error: "Not yours, or no longer there." }, { status: 404 });
  }

  // Marked rather than deleted: the archive copies name and url at snapshot
  // time, but clicks reference the listing and the day's history should not
  // disappear because someone tidied up.
  const { error } = await supabase
    .from("listings")
    .update({ status: "canceled", seat: null, updated_at: new Date().toISOString() })
    .eq("id", listing.id);

  if (error) {
    console.error("listing delete failed", error);
    return NextResponse.json({ error: "Could not remove the listing" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
