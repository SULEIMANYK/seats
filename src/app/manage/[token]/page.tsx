import Link from "next/link";
import { notFound } from "next/navigation";
import { ClimbPanel } from "@/components/ClimbPanel";
import { db, type Listing } from "@/lib/db";
import { polar } from "@/lib/polar";
import { displayDomain } from "@/lib/slug";
import { formatPrice, TIERS, tierToBeat } from "@/lib/tiers";

export const dynamic = "force-dynamic";
// A secret manage link should never end up in a search index.
export const metadata = { robots: { index: false, follow: false } };

type Supabase = ReturnType<typeof db>;

// What a click actually costs elsewhere — the number a $0.14 click on
// frontrow should be measured against, not against zero.
const GOOGLE_CPC_LOW = 3;
const GOOGLE_CPC_HIGH = 8;

/** Kept out of the component body so Date.now() isn't called during render. */
async function loadStats(supabase: Supabase, listingId: string, graceUntil: string | null) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: row }, { count: clicks30d }, { count: clicksTotal }, { data: prices }] =
    await Promise.all([
      supabase.from("board").select("rank").eq("id", listingId).maybeSingle(),
      supabase
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .eq("listing_id", listingId)
        .gte("created_at", since),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("listing_id", listingId),
      supabase.from("board").select("price_cents").returns<{ price_cents: number }[]>(),
    ]);

  const graceDaysLeft = graceUntil
    ? Math.max(0, Math.ceil((new Date(graceUntil).getTime() - Date.now()) / 864e5))
    : null;

  return {
    rank: row?.rank as number | undefined,
    clicks30d,
    clicksTotal,
    graceDaysLeft,
    boardPrices: (prices ?? []).map((p) => p.price_cents),
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
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
        <div
          className={`h-full rounded-full ${tone === "gold" ? "bg-gold" : "bg-white/25"}`}
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

  const { rank, clicks30d, clicksTotal, graceDaysLeft, boardPrices } = await loadStats(
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
  const tierRanks = TIERS.filter((t) => t.cents > listing.price_cents).map((t) => ({
    cents: t.cents,
    label: t.label,
    rank: boardPrices.filter((p) => p >= t.cents).length + 1,
  }));

  const featured = !!rank && rank <= 3;
  const next = tierToBeat(listing.price_cents);

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
            className="size-11 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{listing.name}</h1>
            <p className="truncate text-sm text-muted">{displayDomain(listing.url)}</p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
            listing.status === "active" ? "border-edge text-muted" : "border-gold/40 text-gold"
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
        <div className="relative z-10 mb-6 overflow-hidden rounded-2xl border border-gold/25 bg-gold-soft p-4 shadow-[0_0_0_1px_rgba(240,180,41,0.06),0_18px_40px_-24px_rgba(240,180,41,0.5)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-2 py-0.5 text-[9px] leading-none font-semibold tracking-wide text-gold uppercase">
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
        <div className="relative z-10 mb-6 overflow-hidden rounded-2xl border border-gold/25 bg-gold-soft p-4 shadow-[0_0_0_1px_rgba(240,180,41,0.06),0_18px_40px_-24px_rgba(240,180,41,0.5)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-2 py-0.5 text-[9px] leading-none font-semibold tracking-wide text-gold uppercase">
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
          <p className="text-[11px] text-muted">Rank</p>
          <p className="tnum mt-1 text-3xl leading-none font-semibold">{rank ? `#${rank}` : "—"}</p>
        </div>
        <div className="rounded-2xl border border-edge bg-panel px-4 py-4">
          <p className="text-[11px] text-muted">Clicks · 30d</p>
          <p className="tnum mt-1 text-3xl leading-none font-semibold">
            {(clicks30d ?? 0).toLocaleString()}
          </p>
        </div>
      </section>

      <section className="relative z-10 mb-8 rounded-2xl border border-gold/25 bg-gold-soft p-5 shadow-[0_0_0_1px_rgba(240,180,41,0.06),0_18px_40px_-24px_rgba(240,180,41,0.5)]">
        <p className="text-[11px] text-gold/80">Cost per click · 30d</p>
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
              <CpcBar label="frontrow" value={costPerClick} max={GOOGLE_CPC_HIGH} tone="gold" />
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
        {rank ? (
          <a
            href={`/r/${listing.slug}`}
            target="_blank"
            rel="noopener nofollow"
            className={`group relative isolate flex flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${
              featured
                ? "border-gold/25 bg-gold-soft shadow-[0_0_0_1px_rgba(240,180,41,0.06),0_18px_40px_-24px_rgba(240,180,41,0.5)] hover:border-gold/50"
                : "border-edge bg-panel hover:border-edge-strong hover:bg-panel-hover"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`tnum leading-none font-semibold ${
                  featured ? "text-[28px] text-gold" : "text-[13px] text-muted"
                }`}
              >
                {rank}
              </span>
              <span className="flex items-center gap-1">
                {listing.status === "past_due" && (
                  <span className="rounded-full border border-gold/40 px-1.5 py-0.5 text-[9px] leading-none text-gold">
                    billing
                  </span>
                )}
                <span
                  className={`tnum rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                    featured ? "bg-gold/15 text-gold" : "bg-white/6 text-muted"
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
                className={`mb-2.5 rounded-xl bg-white object-contain p-1 ring-1 ring-white/10 ${
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

            {next && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-fg px-2 py-2 text-center text-[11px] font-semibold text-bg transition-transform duration-200 group-hover:translate-y-0">
                take #{rank} · {next.label}/mo
              </span>
            )}
          </a>
        ) : (
          <div className="flex min-h-[100px] flex-col items-center justify-center rounded-2xl border border-faint px-4 py-6 text-center">
            <p className="text-[13px] text-muted">Not currently on the board.</p>
            <p className="mt-1 text-[11px] text-muted/60">Climb below to get back on.</p>
          </div>
        )}
      </section>

      <section className="relative z-10 mb-8">
        <h2 className="mb-3 text-[13px] font-semibold text-fg">
          Climb — currently {formatPrice(listing.price_cents)}/mo{rank ? ` · #${rank}` : ""}
        </h2>
        <ClimbPanel
          token={listing.manage_token}
          tierRanks={tierRanks}
          currentRank={rank ?? null}
        />
      </section>

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
