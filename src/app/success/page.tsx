import Link from "next/link";
import { CopyManageLink } from "@/components/CopyManageLink";
import { db, type Listing } from "@/lib/db";
import { polar } from "@/lib/polar";
import { displayDomain } from "@/lib/slug";
import { formatPrice } from "@/lib/tiers";

export const dynamic = "force-dynamic";

/** Same source as BoardGrid — real brand marks, not grey initials. */
function faviconFor(url: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    displayDomain(url),
  )}&sz=128`;
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string; try?: string }>;
}) {
  const { checkout_id: checkoutId, try: tryParam } = await searchParams;

  // Auto-retry is bounded. Without a cap, a payment that never activates would
  // have the browser re-hitting Polar's API and Supabase every 4s indefinitely.
  const attempt = Number(tryParam) || 0;
  const MAX_ATTEMPTS = 10;

  let listing: Listing | null = null;
  let rank: number | null = null;
  let clicks: number | null = null;

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
            .select("rank, clicks_30d")
            .eq("id", listing.id)
            .maybeSingle();
          rank = row?.rank ?? null;
          clicks = row?.clicks_30d ?? null;
        }
      }
    } catch (err) {
      console.error("could not load checkout", err);
    }
  }

  // Polar's webhook usually lands before the redirect, but not always.
  const pending = !listing || listing.status === "pending";
  const featured = rank !== null && rank <= 3;

  return (
    <main className="stage relative mx-auto w-full max-w-md px-4 pt-24 pb-24 text-center">
      {pending ? (
        <>
          {/* Auto-retry without any client JS — the webhook usually lands within a
              few seconds, so just quietly re-check instead of asking for a click. */}
          {checkoutId && attempt < MAX_ATTEMPTS && (
            <meta
              httpEquiv="refresh"
              content={`4;url=/success?checkout_id=${checkoutId}&try=${attempt + 1}`}
            />
          )}

          <div className="relative z-10 flex flex-col items-center">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-gold" />
            </span>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight">Payment received</h1>

            {attempt < MAX_ATTEMPTS ? (
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                We&apos;re putting you on the board now — this usually takes a few seconds.
                This page will refresh itself.
              </p>
            ) : (
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                Your payment went through, but the listing hasn&apos;t appeared yet. Nothing
                is lost — keep this page&apos;s address and email us if it doesn&apos;t show
                up shortly.
              </p>
            )}

            <Link
              href={checkoutId ? `/success?checkout_id=${checkoutId}&try=0` : "/"}
              className="mt-7 inline-block rounded-lg border border-edge bg-panel px-4 py-2 text-sm hover:border-edge-strong hover:bg-panel-hover"
            >
              {attempt < MAX_ATTEMPTS ? "Check now" : "Try again"}
            </Link>
          </div>
        </>
      ) : (
        <div className="relative z-10">
          <p className="text-sm text-muted">You&apos;re on the board at</p>
          <p className="tnum mt-1 text-8xl leading-none font-bold text-gold drop-shadow-[0_0_40px_rgba(240,180,41,0.35)]">
            #{rank ?? "—"}
          </p>
          <p className="mt-3 text-sm text-muted">
            {listing!.name} · {formatPrice(listing!.price_cents)}/mo
          </p>

          {/* The listing exactly as it now sits on the board. */}
          <a
            href={`/r/${listing!.slug}`}
            target="_blank"
            rel="noopener nofollow"
            className={`group relative mt-8 isolate flex flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
              featured
                ? "border-gold/25 bg-gold-soft shadow-[0_0_0_1px_rgba(240,180,41,0.06),0_18px_40px_-24px_rgba(240,180,41,0.5)] hover:border-gold/50"
                : "border-edge bg-panel hover:border-edge-strong hover:bg-panel-hover"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`tnum leading-none font-semibold ${
                  featured ? "text-[28px] text-gold" : "text-[11px] text-muted"
                }`}
              >
                {rank ?? "?"}
              </span>
              <span
                className={`tnum rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                  featured ? "bg-gold/15 text-gold" : "bg-white/6 text-muted"
                }`}
              >
                {formatPrice(listing!.price_cents)}
              </span>
            </div>

            <div className="mt-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing!.logo_url ?? faviconFor(listing!.url)}
                alt=""
                className={`mb-2.5 rounded-xl bg-white object-contain p-1 ring-1 ring-white/10 ${
                  featured ? "size-12 p-1.5" : "size-8"
                }`}
              />

              <p className={`truncate font-semibold tracking-tight ${featured ? "text-lg" : "text-[13px]"}`}>
                {listing!.name}
              </p>

              {featured ? (
                <>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">
                    {listing!.tagline}
                  </p>
                  <p className="tnum mt-2 text-[11px] text-muted/70">
                    {displayDomain(listing!.url)}
                    {clicks !== null && ` · ${clicks.toLocaleString()} clicks`}
                  </p>
                </>
              ) : (
                <p className="tnum mt-0.5 truncate text-[11px] text-muted/70">
                  {displayDomain(listing!.url)}
                </p>
              )}
            </div>

            <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-fg px-2 py-2 text-center text-[11px] font-semibold text-bg transition-transform duration-200 group-hover:translate-y-0">
              view live listing
            </span>
          </a>

          <div className="mt-8 rounded-xl border border-gold/25 bg-gold-soft p-4 text-left">
            <p className="text-sm font-medium text-fg">Save this link now</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              This is the only way you can ever climb, edit, or cancel this listing — we don&apos;t
              send it by email, and it won&apos;t be shown again after you leave this page. Anyone
              who has it controls your listing, so keep it private.
            </p>
            <CopyManageLink token={listing!.manage_token} />
          </div>

          <div className="mt-6 flex justify-center gap-2 text-sm">
            <Link
              href={`/manage/${listing!.manage_token}`}
              className="rounded-lg bg-fg px-4 py-2 font-medium text-bg shadow-[0_10px_30px_-12px_rgba(255,255,255,0.5)] transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Open manage page
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-edge px-4 py-2 transition hover:border-edge-strong hover:bg-panel-hover"
            >
              See the board
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
