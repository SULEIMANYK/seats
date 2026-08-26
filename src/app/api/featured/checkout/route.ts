import { NextResponse } from "next/server";
import { authoriseListing } from "@/lib/listing-auth";
import { createFeaturedCheckout } from "@/lib/dodo";
import { SITE } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Start checkout for a featured placement.
 *
 * Authorised by the listing's manage token, the same credential everything
 * else uses: you can only buy placement for a product you demonstrably own.
 * The domain comes from the listing rather than the request body, so it
 * cannot be pointed at someone else's product.
 */
export async function POST(request: Request) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listing, supabase } = await authoriseListing(body.token);
  if (!listing) {
    return NextResponse.json({ error: "Not yours, or no longer there." }, { status: 404 });
  }

  const { data: already } = await supabase
    .from("featured")
    .select("domain")
    .eq("domain", listing.domain)
    .maybeSingle();

  if (already) {
    return NextResponse.json(
      { error: "This product is already featured.", alreadyFeatured: true },
      { status: 409 },
    );
  }

  const result = await createFeaturedCheckout({
    domain: listing.domain,
    returnUrl: `https://${SITE.domain}/manage/${listing.manage_token}?featured=pending`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url });
}
