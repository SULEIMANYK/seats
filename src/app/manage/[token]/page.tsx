import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Listing } from "@/lib/db";
import { placeListings, type Placeable } from "@/lib/seating";
import { BadgeEmbed } from "@/components/BadgeEmbed";
import { EditListing } from "@/components/EditListing";
import { MoveSeat } from "@/components/MoveSeat";
import { displayDomain } from "@/lib/slug";

export const dynamic = "force-dynamic";
// A secret manage link should never end up in a search index.
export const metadata = { robots: { index: false, follow: false } };

type Supabase = ReturnType<typeof db>;

// What a click actually costs elsewhere — the number a $0.14 click on
// seats.lol should be measured against, not against zero.

/** Kept out of the component body so Date.now() isn't called during render. */
async function loadStats(supabase: Supabase, listingId: string) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: seated }, { count: clicks30d }, { count: clicksTotal }, { data: bench }] =
    await Promise.all([
      supabase.from("board").select("id, rank, name, clicks_7d").returns<(Placeable & { name: string; clicks_7d: number })[]>(),
      supabase
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .eq("listing_id", listingId)
        .gte("created_at", since),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("listing_id", listingId),
      supabase.from("category_benchmark").select("*").eq("id", listingId).maybeSingle(),
    ]);

  return {
    // The seat the chart actually shows, not a price ordering — those two
    // disagree, and the dashboard must not contradict the board.
    seat: placeListings(seated ?? []).get(listingId),
    seated: seated ?? [],
    bench: bench as { category_rank: number; category_size: number; category_avg_clicks: number } | null,
    clicks30d,
    clicksTotal,
  };
}

/** Real brand marks, same treatment as the board itself. */
function faviconFor(url: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    displayDomain(url),
  )}&sz=128`;
}

/** A tiny horizontal comparison bar for the cost-per-click hero. */
const STATUS_LABEL: Record<Listing["status"], string> = {
  pending: "Pending",
  active: "Live",
  past_due: "Payment failed",
  grace: "Grace period",
  canceled: "Canceled",
};

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: isNew } = await searchParams;
  const { token } = await params;
  const supabase = db();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle<Listing>();

  if (!listing) notFound();


  const { seat, seated, clicks30d, clicksTotal, bench } = await loadStats(supabase, listing.id);

  // Every seat the chart currently shows as occupied. The picker greys these
  // out; the API refuses them again on submit, because this list is a render
  // old the moment it reaches the browser.
  const takenSeats = [...placeListings(seated).values()];

  // Seats are free, so there is no cost per click to report.

  // What each higher price would actually buy: ties break toward whoever
  // climbed first, so landing on a price now puts you behind everyone
  // already sitting at or above it.

  const featured = !!seat && seat <= 3;

  return (
    <main className="stage relative mx-auto w-full max-w-lg px-4 pt-14 pb-24 sm:px-6">
      <Link href="/" className="relative z-10 text-sm text-muted transition hover:text-fg">
        ← back to the board
      </Link>

      {isNew && (
        <section className="relative z-10 mt-5 rounded-2xl border border-gold-line bg-gold-soft p-5 card-shadow">
          <h2 className="text-[15px] font-semibold">You&apos;re on the board.</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Save this page&apos;s address — it is the only way to edit or remove your listing,
            and it is shown nowhere else. Anyone with the link controls the listing.
          </p>
        </section>
      )}

      <header className="relative z-10 mt-6 mb-8 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            referrerPolicy="no-referrer"
            src={listing.logo_url ?? faviconFor(listing.url)}
            alt=""
            className="size-11 shrink-0 rounded-xl bg-bg object-contain p-1 ring-1 ring-edge"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{listing.name}</h1>
            <p className="truncate text-sm text-muted">{displayDomain(listing.url)}</p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
            listing.status === "active" ? "border-edge text-muted" : "border-gold-line text-gold"
          }`}
        >
          <span className="relative flex size-1.5">
            {listing.status !== "active" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
            )}
            <span
              className={`relative inline-flex size-1.5 rounded-full ${
                listing.status === "active" ? "bg-muted" : "bg-gold"
              }`}
            />
          </span>
          {STATUS_LABEL[listing.status]}
        </span>
      </header>


      {listing.status === "past_due" && (
        <div className="relative z-10 mb-6 overflow-hidden rounded-2xl border border-gold-line bg-gold-soft p-4 card-shadow">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-line px-2 py-0.5 text-[9px] leading-none font-semibold tracking-wide text-gold uppercase">
            Billing
          </span>
          <p className="mt-2.5 text-[13px] leading-relaxed text-fg/90">
            Your last payment didn&apos;t go through. Update your card in the billing portal
            below to keep your slot.
          </p>
        </div>
      )}

      {/* The retention story: where you stand and what it's buying you. */}
      <section className="relative z-10 mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-edge bg-panel px-4 py-4">
          <p className="text-[11px] text-muted">Seat</p>
          <p className="tnum mt-1 text-3xl leading-none font-semibold">{seat ? `#${seat}` : "—"}</p>
        </div>
        <div className="rounded-2xl border border-edge bg-panel px-4 py-4">
          <p className="text-[11px] text-muted">Clicks · 30d</p>
          <p className="tnum mt-1 text-3xl leading-none font-semibold">
            {(clicks30d ?? 0).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="relative z-10 mb-8 rounded-2xl border border-gold-line bg-gold-soft p-5 card-shadow">
        <p className="text-[11px] tracking-wide text-gold uppercase">Clicks today</p>
        <p className="tnum mt-1 text-4xl leading-none font-semibold text-gold">
          {clicks30d ?? 0}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-fg/80">
          Every click your seat sent onward, counted and shown in public. The seat costs
          nothing, so this is the whole return.
        </p>
      </section>

      <section className="relative z-10 mb-8">
        <h2 className="mb-3 text-[13px] font-semibold text-fg">How you appear on the board</h2>
        {seat ? (
          <a
            href={`/r/${listing.slug}`}
            target="_blank"
            rel="noopener nofollow"
            className={`group relative isolate flex flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
              featured
                ? "border-gold-line bg-gold-soft card-shadow hover:border-gold"
                : "border-edge bg-panel hover:border-edge-strong hover:bg-panel-hover"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`tnum leading-none font-semibold ${
                  featured ? "text-[28px] text-gold" : "text-[13px] text-muted"
                }`}
              >
                {seat}
              </span>
              <span className="flex items-center gap-1">
                {listing.status === "past_due" && (
                  <span className="rounded-full border border-gold-line px-1.5 py-0.5 text-[9px] leading-none text-gold">
                    billing
                  </span>
                )}
                <span
                  className={`tnum rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                    featured ? "bg-gold-soft text-gold" : "bg-faint text-muted"
                  }`}
                >
                  {clicks30d ?? 0} clicks
                </span>
              </span>
            </div>

            <div className="mt-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                referrerPolicy="no-referrer"
                src={listing.logo_url ?? faviconFor(listing.url)}
                alt=""
                className={`mb-2.5 rounded-xl bg-bg object-contain p-1 ring-1 ring-edge ${
                  featured ? "size-12 p-1.5" : "size-9"
                }`}
              />
              <p className={`truncate font-semibold tracking-tight ${featured ? "text-lg" : "text-[15px]"}`}>
                {listing.name}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">
                {listing.tagline}
              </p>
              <p className="tnum mt-2 text-[11px] text-muted/70">
                {displayDomain(listing.url)} · {(clicks30d ?? 0).toLocaleString()} clicks
              </p>
            </div>
          </a>
        ) : (
          <div className="flex min-h-[100px] flex-col items-center justify-center rounded-2xl border border-faint px-4 py-6 text-center">
            <p className="text-[13px] text-muted">Not currently on the board.</p>
            <p className="mt-1 text-[11px] text-muted/60">Climb below to get back on.</p>
          </div>
        )}
      </section>

      {bench && bench.category_size > 1 && (
        <section className="relative z-10 mb-8 rounded-2xl border border-edge bg-panel p-5 card-shadow">
          <h2 className="text-[13px] font-semibold">Category standing</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            You are <span className="tnum font-semibold text-fg">#{bench.category_rank}</span> of{" "}
            <span className="tnum font-semibold text-fg">{bench.category_size}</span> in{" "}
            <span className="font-semibold text-fg">{listing.category ?? "your category"}</span>.
            The average listing there earned{" "}
            <span className="tnum font-semibold text-fg">{bench.category_avg_clicks}</span> clicks
            this week.
          </p>
                  </section>
      )}

      
      {listing.status === "active" && (
        <MoveSeat token={listing.manage_token} current={seat ?? null} taken={takenSeats} />
      )}

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
        <h2 className="mb-2 font-semibold tracking-tight text-fg">Your seat</h2>
        <p className="text-muted">
          Free, and held until midnight UTC. After that every seat frees up and you can claim
          one again from your dashboard in a click.
        </p>
        <p className="tnum mt-6 text-xs text-muted">
          {(clicksTotal ?? 0).toLocaleString()} clicks all time · on the board since{" "}
          {new Date(listing.created_at).toLocaleDateString()}
        </p>
      </section>
    </main>
  );
}
