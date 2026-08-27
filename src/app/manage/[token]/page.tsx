import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Listing } from "@/lib/db";
import { BadgeEmbed } from "@/components/BadgeEmbed";
import { EditListing } from "@/components/EditListing";
import { BidBox } from "@/components/BidBox";
import { displayDomain } from "@/lib/slug";
import { formatMoney } from "@/lib/bidding";
import { Favicon } from "@/components/Favicon";

export const dynamic = "force-dynamic";
// A secret manage link should never end up in a search index.
export const metadata = { robots: { index: false, follow: false } };

type Supabase = ReturnType<typeof db>;

/**
 * Everything this page shows about standing comes from the leaderboard view,
 * the same one the public board renders. The previous version read the seats
 * views, which return nothing now, so the listing sitting at #1 was told it
 * was "not currently on the board".
 */
async function load(supabase: Supabase, listingId: string) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: mine }, { data: top }, { count: clicks30d }, { count: clicksTotal }] =
    await Promise.all([
      supabase
        .from("leaderboard")
        .select("rank, bid_cents, clicks_24h, category")
        .eq("id", listingId)
        .maybeSingle<{ rank: number; bid_cents: number; clicks_24h: number; category: string | null }>(),
      supabase
        .from("leaderboard")
        .select("bid_cents")
        .order("rank")
        .limit(1)
        .maybeSingle<{ bid_cents: number }>(),
      supabase
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .eq("listing_id", listingId)
        .gte("created_at", since),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("listing_id", listingId),
    ]);

  return { mine, topCents: top?.bid_cents ?? 0, clicks30d: clicks30d ?? 0, clicksTotal: clicksTotal ?? 0 };
}

const STATUS_LABEL: Record<Listing["status"], string> = {
  pending: "Pending",
  active: "Live",
  past_due: "Payment failed",
  grace: "Grace period",
  canceled: "Removed",
};

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string; bid?: string }>;
}) {
  const { new: isNew, bid: bidParam } = await searchParams;
  const { token } = await params;
  const supabase = db();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle<Listing>();

  if (!listing) notFound();

  const { mine, topCents, clicks30d, clicksTotal } = await load(supabase, listing.id);

  return (
    <main className="stage relative mx-auto w-full max-w-lg px-4 pt-14 pb-24 sm:px-6">
      <Link href="/" className="relative z-10 text-sm text-muted transition hover:text-fg">
        ← back to the board
      </Link>

      {isNew && (
        <section className="relative z-10 mt-5 rounded-2xl border border-gold-line bg-gold-soft p-5 card-shadow">
          <h2 className="text-[15px] font-semibold">You&apos;re listed.</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Save this page&apos;s address &mdash; it is the only way to edit, bid for, or remove
            your listing, and it is shown nowhere else. Anyone with the link controls it.
          </p>
        </section>
      )}

      <header className="relative z-10 mt-6 mb-8 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Favicon
            logoUrl={listing.logo_url}
            domain={displayDomain(listing.url)}
            className="size-11 shrink-0 rounded-xl bg-bg object-contain p-1 ring-1 ring-edge"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl">{listing.name}</h1>
            <p className="truncate text-sm text-muted">{displayDomain(listing.url)}</p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
            listing.status === "active" ? "border-edge text-muted" : "border-gold-line text-gold"
          }`}
        >
          {STATUS_LABEL[listing.status]}
        </span>
      </header>

      <section className="relative z-10 mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-edge bg-panel px-3 py-3">
          <p className="text-[11px] text-muted">Rank</p>
          <p className="tnum font-display mt-1 text-2xl leading-none">
            {mine ? `#${mine.rank}` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-edge bg-panel px-3 py-3">
          <p className="text-[11px] text-muted">Your bid</p>
          <p className="tnum font-display mt-1 text-2xl leading-none">
            {formatMoney(listing.bid_cents ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-edge bg-panel px-3 py-3">
          <p className="text-[11px] text-muted">Clicks · 30d</p>
          <p className="tnum font-display mt-1 text-2xl leading-none">
            {clicks30d.toLocaleString()}
          </p>
        </div>
      </section>

      <BidBox
        token={listing.manage_token}
        name={listing.name}
        currentCents={mine?.bid_cents ?? listing.bid_cents ?? 0}
        rank={mine?.rank ?? null}
        topCents={topCents}
        pending={bidParam === "pending"}
      />

      <EditListing
        token={listing.manage_token}
        listing={{
          name: listing.name,
          tagline: listing.tagline,
          description: listing.description,
          category: listing.category,
          pricing_model: listing.pricing_model,
          logo_url: listing.logo_url,
          image_url: listing.image_url,
          extra_links: listing.extra_links ?? [],
        }}
      />

      <BadgeEmbed slug={listing.slug} />

      <section className="relative z-10 border-t border-edge pt-6 text-sm">
        <h2 className="mb-2 text-[15px]">Your listing</h2>
        <p className="text-muted">
          {mine
            ? "Held for as long as nobody pays more. If someone outbids you, you drop below them and the bid is not returned."
            : "Not ranked yet. Any bid puts you on the board."}
        </p>
        <p className="tnum mt-6 text-xs text-muted">
          {clicksTotal.toLocaleString()} clicks all time · listed since{" "}
          {new Date(listing.created_at).toLocaleDateString()}
        </p>
      </section>
    </main>
  );
}
