import Link from "next/link";
import { notFound } from "next/navigation";
import { ClimbPanel } from "@/components/ClimbPanel";
import { db, type Listing } from "@/lib/db";
import { polar } from "@/lib/polar";
import { displayDomain } from "@/lib/slug";
import { formatPrice } from "@/lib/tiers";

export const dynamic = "force-dynamic";
// A secret manage link should never end up in a search index.
export const metadata = { robots: { index: false, follow: false } };

type Supabase = ReturnType<typeof db>;

/** Kept out of the component body so the timestamp isn't computed during render. */
async function loadStats(supabase: Supabase, listingId: string) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: row }, { count: clicks30d }, { count: clicksTotal }] = await Promise.all([
    supabase.from("board").select("rank").eq("id", listingId).maybeSingle(),
    supabase
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .gte("created_at", since),
    supabase.from("clicks").select("*", { count: "exact", head: true }).eq("listing_id", listingId),
  ]);

  return { rank: row?.rank as number | undefined, clicks30d, clicksTotal };
}

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = db();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle<Listing>();

  if (!listing) notFound();

  const { rank, clicks30d, clicksTotal } = await loadStats(supabase, listing.id);

  // Card changes, invoices and cancellation all live in Polar's portal —
  // no reason to rebuild any of that here.
  let portalUrl: string | null = null;
  if (listing.polar_customer_id) {
    try {
      const session = await polar().customerSessions.create({
        customerId: listing.polar_customer_id,
      });
      portalUrl = session.customerPortalUrl;
    } catch (err) {
      console.error("could not create customer session", err);
    }
  }

  const costPerClick =
    clicks30d && clicks30d > 0 ? listing.price_cents / 100 / clicks30d : null;

  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-14 pb-24">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{listing.name}</h1>
        <p className="text-sm text-muted">{displayDomain(listing.url)}</p>
      </header>

      {listing.status === "grace" && (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/5 p-4 text-sm text-gold">
          <p className="font-medium">You were pushed off the board.</p>
          <p className="mt-1">
            The board filled up and someone outpaid you. Raise your price below to come back
            {listing.grace_until
              ? ` before ${new Date(listing.grace_until).toLocaleDateString()}`
              : ""}
            . You won&apos;t be charged again in the meantime.
          </p>
        </div>
      )}

      {listing.status === "past_due" && (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/5 p-4 text-sm text-gold">
          Your last payment failed. Update your card in the billing portal to keep your slot.
        </div>
      )}

      <dl className="mb-8 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-edge bg-panel px-3 py-4">
          <dt className="text-xs text-muted">Rank</dt>
          <dd className="tnum mt-1 text-2xl font-semibold">
            {rank ? `#${rank}` : "—"}
          </dd>
        </div>
        <div className="rounded-xl border border-edge bg-panel px-3 py-4">
          <dt className="text-xs text-muted">Clicks (30d)</dt>
          <dd className="tnum mt-1 text-2xl font-semibold">{clicks30d ?? 0}</dd>
        </div>
        <div className="rounded-xl border border-edge bg-panel px-3 py-4">
          <dt className="text-xs text-muted">Per click</dt>
          <dd className="tnum mt-1 text-2xl font-semibold">
            {costPerClick ? `$${costPerClick.toFixed(2)}` : "—"}
          </dd>
        </div>
      </dl>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">
          Climb — currently {formatPrice(listing.price_cents)}/mo
        </h2>
        <ClimbPanel token={listing.manage_token} currentCents={listing.price_cents} />
      </section>

      <section className="border-t border-edge pt-6 text-sm">
        <h2 className="mb-2 font-medium">Billing</h2>
        <p className="text-muted">
          Card, invoices, lowering your price and cancelling all live in the billing portal.
          Cancel any time — you keep the slot until the period ends.
        </p>
        {portalUrl ? (
          <a
            href={portalUrl}
            className="mt-3 inline-block rounded-lg border border-edge px-4 py-2 hover:border-muted"
          >
            Open billing portal →
          </a>
        ) : (
          <p className="mt-3 text-xs text-muted">
            Billing portal unavailable — the subscription isn&apos;t active yet.
          </p>
        )}
        <p className="tnum mt-6 text-xs text-muted">
          {clicksTotal ?? 0} clicks all time · on the board since{" "}
          {new Date(listing.created_at).toLocaleDateString()}
        </p>
      </section>
    </main>
  );
}
