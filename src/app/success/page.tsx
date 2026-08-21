import Link from "next/link";
import { db, type Listing } from "@/lib/db";
import { polar } from "@/lib/polar";
import { formatPrice } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const { checkout_id: checkoutId } = await searchParams;

  let listing: Listing | null = null;
  let rank: number | null = null;

  if (checkoutId) {
    try {
      const checkout = await polar().checkouts.get({ id: checkoutId });
      const listingId = checkout.metadata?.listing_id as string | undefined;

      if (listingId) {
        const supabase = db();
        const { data } = await supabase
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .maybeSingle<Listing>();
        listing = data;

        if (listing?.status === "active") {
          const { data: row } = await supabase
            .from("board")
            .select("rank")
            .eq("id", listing.id)
            .maybeSingle();
          rank = row?.rank ?? null;
        }
      }
    } catch (err) {
      console.error("could not load checkout", err);
    }
  }

  // Polar's webhook usually lands before the redirect, but not always.
  const pending = !listing || listing.status === "pending";

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-24 pb-24 text-center">
      {pending ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Payment received</h1>
          <p className="mt-3 text-sm text-muted">
            We&apos;re putting you on the board now — this takes a few seconds. Refresh to
            get your manage link.
          </p>
          <Link
            href={checkoutId ? `/success?checkout_id=${checkoutId}` : "/"}
            className="mt-6 inline-block rounded-lg border border-edge px-4 py-2 text-sm hover:border-muted"
          >
            Refresh
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">You&apos;re on the board at</p>
          <p className="tnum mt-2 text-6xl font-semibold text-gold">#{rank}</p>
          <p className="mt-3 text-sm text-muted">
            {listing!.name} · {formatPrice(listing!.price_cents)}/mo
          </p>

          <div className="mt-8 rounded-xl border border-edge bg-panel p-4 text-left">
            <p className="text-sm font-medium">Save this link</p>
            <p className="mt-1 text-xs text-muted">
              It&apos;s how you climb, edit, or cancel. Anyone with it controls your listing,
              so keep it private — and save it now, because this page is the only place
              it&apos;s shown.
            </p>
            <code className="mt-3 block break-all rounded-lg bg-bg px-3 py-2 font-mono text-xs text-accent">
              /manage/{listing!.manage_token}
            </code>
          </div>

          <div className="mt-6 flex justify-center gap-2 text-sm">
            <Link href={`/manage/${listing!.manage_token}`} className="rounded-lg bg-fg px-4 py-2 font-medium text-bg hover:opacity-90">
              Open manage page
            </Link>
            <Link href="/" className="rounded-lg border border-edge px-4 py-2 hover:border-muted">
              See the board
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
