import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Listing } from "@/lib/db";
import { placeListings, type Placeable } from "@/lib/seating";
import { PLAN_BY_ID, atLeast, type PlanId } from "@/lib/plans";
import { BadgeEmbed } from "@/components/BadgeEmbed";
import { polar } from "@/lib/polar";
import { displayDomain } from "@/lib/slug";
import { formatPrice } from "@/lib/tiers";

export const dynamic = "force-dynamic";
// A secret manage link should never end up in a search index.
export const metadata = { robots: { index: false, follow: false } };

type Supabase = ReturnType<typeof db>;

// What a click actually costs elsewhere — the number a $0.14 click on
// seats.lol should be measured against, not against zero.
const GOOGLE_CPC_LOW = 3;
const GOOGLE_CPC_HIGH = 8;

/** Kept out of the component body so Date.now() isn't called during render. */
async function loadStats(supabase: Supabase, listingId: string, graceUntil: string | null) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: seated }, { count: clicks30d }, { count: clicksTotal }, { data: bench }, { data: abTest }] =
    await Promise.all([
      supabase.from("board").select("id, rank, name, clicks_7d").returns<(Placeable & { name: string; clicks_7d: number })[]>(),
      supabase
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .eq("listing_id", listingId)
        .gte("created_at", since),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("listing_id", listingId),
      supabase.from("category_benchmark").select("*").eq("id", listingId).maybeSingle(),
      supabase.from("tagline_test").select("*").eq("id", listingId).maybeSingle(),
    ]);

  const graceDaysLeft = graceUntil
    ? Math.max(0, Math.ceil((new Date(graceUntil).getTime() - Date.now()) / 864e5))
    : null;

  return {
    // The seat the chart actually shows, not a price ordering — those two
    // disagree, and the dashboard must not contradict the board.
    seat: placeListings(seated ?? []).get(listingId),
    seated: seated ?? [],
    bench: bench as { category_rank: number; category_size: number; category_avg_clicks: number } | null,
    abTest: abTest as { variant_a: string; variant_b: string; clicks_a: number; clicks_b: number } | null,
    clicks30d,
    clicksTotal,
    graceDaysLeft,
  };
}

/** Real brand marks, same treatment as the board itself. */
function faviconFor(url: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    displayDomain(url),
  )}&sz=128`;
}

/** A tiny horizontal comparison bar for the cost-per-click hero. */
function CpcBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "gold" | "muted";
}) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className={`w-[76px] shrink-0 text-[11px] ${tone === "gold" ? "text-gold" : "text-muted"}`}>
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-faint">
        <div
          className={`h-full rounded-full ${tone === "gold" ? "bg-gold" : "bg-edge-strong"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`tnum w-14 shrink-0 text-right text-[11px] ${tone === "gold" ? "text-gold" : "text-muted"}`}
      >
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

const STATUS_LABEL: Record<Listing["status"], string> = {
  pending: "Pending",
  active: "Live",
  past_due: "Payment failed",
  grace: "Grace period",
  canceled: "Canceled",
};

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

  const plan = (listing.plan ?? "listed") as PlanId;

  const { seat, clicks30d, clicksTotal, graceDaysLeft, bench, abTest } = await loadStats(
    supabase,
    listing.id,
    listing.grace_until,
  );

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
  const cheaperBy = costPerClick && costPerClick > 0 ? GOOGLE_CPC_LOW / costPerClick : null;

  // What each higher price would actually buy: ties break toward whoever
  // climbed first, so landing on a price now puts you behind everyone
  // already sitting at or above it.

  const featured = !!seat && seat <= 3;

  return (
    <main className="stage relative mx-auto w-full max-w-lg px-4 pt-14 pb-24 sm:px-6">
      <Link href="/" className="relative z-10 text-sm text-muted transition hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-8 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
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

      {listing.status === "grace" && (
        <div className="relative z-10 mb-6 overflow-hidden rounded-2xl border border-gold-line bg-gold-soft p-4 card-shadow">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-line px-2 py-0.5 text-[9px] leading-none font-semibold tracking-wide text-gold uppercase">
            Grace period
          </span>
          <p className="mt-2.5 text-[13px] leading-relaxed text-fg/90">
            The board filled up and someone outpaid you. Raise your price below to come back
            {graceDaysLeft !== null
              ? ` — ${graceDaysLeft <= 0 ? "today's the last day" : `${graceDaysLeft} day${graceDaysLeft === 1 ? "" : "s"} left`}`
              : ""}
            . You won&apos;t be charged again in the meantime.
          </p>
        </div>
      )}

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
        <p className="text-[11px] text-gold">Cost per click · 30d</p>
        {costPerClick ? (
          <>
            <p className="tnum mt-1 text-4xl leading-none font-semibold text-gold">
              ${costPerClick.toFixed(2)}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-fg/80">
              Google Ads runs ${GOOGLE_CPC_LOW}–${GOOGLE_CPC_HIGH} a click for comparable SaaS
              keywords
              {cheaperBy && cheaperBy >= 1.5 ? ` — you're paying ${Math.round(cheaperBy)}× less.` : "."}
            </p>
            <div className="mt-4 space-y-2">
              <CpcBar label="seats.lol" value={costPerClick} max={GOOGLE_CPC_HIGH} tone="gold" />
              <CpcBar
                label="Google Ads"
                value={(GOOGLE_CPC_LOW + GOOGLE_CPC_HIGH) / 2}
                max={GOOGLE_CPC_HIGH}
                tone="muted"
              />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-fg/70">
            No clicks yet in the last 30 days — check back once traffic comes in.
          </p>
        )}
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
                  {formatPrice(listing.price_cents)}
                </span>
              </span>
            </div>

            <div className="mt-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
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
          {!atLeast(plan, "pro") && (
            <p className="mt-3 text-[12px] text-muted/80">
              {PLAN_BY_ID.pro.name} adds UTM tagging, tagline testing and a weekly report.
            </p>
          )}
        </section>
      )}

      {atLeast(plan, "pro") && abTest && (
        <section className="relative z-10 mb-8 rounded-2xl border border-edge bg-panel p-5 card-shadow">
          <h2 className="text-[13px] font-semibold">Tagline test</h2>
          <div className="mt-3 space-y-2">
            {[
              { label: "A", text: abTest.variant_a, clicks: abTest.clicks_a },
              { label: "B", text: abTest.variant_b, clicks: abTest.clicks_b },
            ].map((v) => {
              const winning =
                v.clicks > 0 && v.clicks >= Math.max(abTest.clicks_a, abTest.clicks_b);
              return (
                <div
                  key={v.label}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    winning ? "border-gold-line bg-gold-soft" : "border-edge"
                  }`}
                >
                  <span className="tnum text-[11px] font-semibold text-muted">{v.label}</span>
                  <span className="flex-1 text-[13px]">{v.text}</span>
                  <span className="tnum text-[13px] font-semibold">{v.clicks}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-muted/80">
            Both are shown at random. Whichever earns more clicks is the one to keep.
          </p>
        </section>
      )}

      {atLeast(plan, "growth") && <BadgeEmbed slug={listing.slug} />}

      <section className="relative z-10 border-t border-edge pt-6 text-sm">
        <h2 className="mb-2 font-semibold tracking-tight text-fg">Billing</h2>
        <p className="text-muted">
          Card, invoices, lowering your price and cancelling all live in the billing portal.
          Cancel any time — you keep the slot until the period ends.
        </p>
        {portalUrl ? (
          <a
            href={portalUrl}
            className="mt-3 inline-block rounded-xl border border-edge bg-panel px-4 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-edge-strong hover:bg-panel-hover"
          >
            Open billing portal →
          </a>
        ) : (
          <p className="mt-3 text-xs text-muted">
            Billing portal unavailable — the subscription isn&apos;t active yet.
          </p>
        )}
        <p className="tnum mt-6 text-xs text-muted">
          {(clicksTotal ?? 0).toLocaleString()} clicks all time · on the board since{" "}
          {new Date(listing.created_at).toLocaleDateString()}
        </p>
      </section>
    </main>
  );
}
