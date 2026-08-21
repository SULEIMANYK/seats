import Link from "next/link";
import type { BoardRow } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { BOARD_SIZE, formatPrice, tierToBeat } from "@/lib/tiers";

/**
 * Size is the reward. What you pay buys you area and position, not just a
 * number in a list — #1 is the widest card and sits dead centre of the top
 * row, flanked by #2 and #3, and every tier below gets visibly less room.
 *
 * Twelve columns on desktop makes that split clean: 3 | 6 | -3.
 */

type Size = "hero" | "podium" | "medium" | "compact" | "tiny";

function sizeFor(rank: number): Size {
  if (rank === 1) return "hero";
  if (rank <= 3) return "podium";
  if (rank <= 9) return "medium";
  if (rank <= 30) return "compact";
  return "tiny";
}

/**
 * The top three are placed explicitly so #1 lands in the middle. Everything
 * below flows. Mobile keeps DOM order (1, 2, 3 down the page) because the
 * explicit placement only kicks in at md.
 */
function spanFor(rank: number, size: Size) {
  if (rank === 1) {
    return "col-span-4 row-span-3 md:col-start-4 md:col-span-6 md:row-start-1 md:row-span-3";
  }
  if (rank === 2) {
    return "col-span-2 row-span-2 md:col-start-1 md:col-span-3 md:row-start-1 md:row-span-3";
  }
  if (rank === 3) {
    return "col-span-2 row-span-2 md:col-start-10 md:col-span-3 md:row-start-1 md:row-span-3";
  }
  if (size === "medium") return "col-span-2 row-span-2";
  if (size === "compact") return "col-span-2";
  return "col-span-1";
}

function faviconFor(url: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    displayDomain(url),
  )}&sz=128`;
}

function Logo({ row, className }: { row: BoardRow; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={row.logo_url ?? faviconFor(row.url)}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge ${className}`}
    />
  );
}

function FilledBox({ row }: { row: BoardRow }) {
  const next = tierToBeat(row.price_cents);
  const size = sizeFor(row.rank);
  const featured = row.rank <= 3;

  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener nofollow"
      className={`group relative isolate flex flex-col overflow-hidden rounded-2xl border bg-panel transition-all duration-200 hover:-translate-y-0.5 hover:card-shadow-lift ${
        featured ? "border-gold-line card-shadow" : "border-edge card-shadow"
      } ${size === "tiny" ? "p-2" : "p-4"} ${spanFor(row.rank, size)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`tnum leading-none font-semibold ${
            size === "hero"
              ? "text-4xl text-gold"
              : size === "podium"
                ? "text-2xl text-gold"
                : "text-[11px] text-muted"
          }`}
        >
          {row.rank}
        </span>

        {size !== "tiny" && (
          <span className="flex items-center gap-1">
            {row.status === "past_due" && (
              <span className="rounded-full border border-gold-line px-1.5 py-0.5 text-[9px] leading-none text-gold">
                billing
              </span>
            )}
            <span
              className={`tnum rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                featured ? "bg-gold-soft text-gold" : "bg-faint text-muted"
              }`}
            >
              {formatPrice(row.price_cents)}
            </span>
          </span>
        )}
      </div>

      {/* Tiny and compact tiers put the logo beside the name; the bigger tiers
          stack it above, where there is room for it to be an image. */}
      {size === "tiny" ? (
        <div className="mt-auto flex items-center justify-center">
          <Logo row={row} className="size-7" />
        </div>
      ) : size === "compact" ? (
        <div className="mt-auto flex items-center gap-2">
          <Logo row={row} className="size-7" />
          <span className="truncate text-[13px] font-medium">{row.name}</span>
        </div>
      ) : (
        <div className="mt-auto min-w-0">
          <Logo
            row={row}
            className={`mb-3 ${size === "hero" ? "size-14" : size === "podium" ? "size-11" : "size-9"}`}
          />
          <p
            className={`truncate font-semibold tracking-tight ${
              size === "hero" ? "text-2xl" : size === "podium" ? "text-lg" : "text-sm"
            }`}
          >
            {row.name}
          </p>

          {size !== "medium" && (
            <p
              className={`mt-1 text-muted ${size === "hero" ? "line-clamp-2 text-[15px]" : "line-clamp-2 text-[13px]"}`}
            >
              {row.tagline}
            </p>
          )}

          <p className="tnum mt-2 truncate text-[11px] text-muted/80">
            {size === "medium"
              ? `${row.clicks_30d.toLocaleString()} clicks`
              : `${displayDomain(row.url)} · ${row.clicks_30d.toLocaleString()} clicks`}
          </p>
        </div>
      )}

      {next && size !== "tiny" && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-fg px-2 py-2 text-center text-[11px] font-semibold text-bg-lift transition-transform duration-200 group-hover:translate-y-0">
          take #{row.rank} · {next.label}/mo
        </span>
      )}
    </a>
  );
}

function EmptyBox({ rank, cents }: { rank: number; cents: number }) {
  const size = sizeFor(rank);

  return (
    <Link
      href={`/submit?cents=${cents}`}
      className={`group flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge-strong/60 bg-bg-lift/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-panel hover:card-shadow ${
        size === "tiny" ? "p-2" : "p-4"
      } ${spanFor(rank, size)}`}
    >
      <span className="tnum text-[11px] text-muted/45 transition-colors group-hover:text-accent">
        {rank}
      </span>
      {size !== "tiny" && (
        <span className="mt-1 text-[11px] text-muted/0 transition-colors group-hover:text-accent">
          claim · {formatPrice(cents)}
        </span>
      )}
    </Link>
  );
}

export function BoardGrid({ rows, floorCents }: { rows: BoardRow[]; floorCents: number }) {
  const empty = Array.from(
    { length: Math.max(0, BOARD_SIZE - rows.length) },
    (_, i) => rows.length + i + 1,
  );

  return (
    <div className="relative z-10 grid auto-rows-[minmax(0,4.25rem)] grid-cols-4 gap-3 [grid-auto-flow:dense] md:grid-cols-12">
      {rows.map((row) => (
        <FilledBox key={row.id} row={row} />
      ))}
      {empty.map((rank) => (
        <EmptyBox key={rank} rank={rank} cents={floorCents} />
      ))}
    </div>
  );
}
