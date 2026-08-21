import Link from "next/link";
import type { BoardRow } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { BOARD_SIZE, formatPrice, tierToBeat } from "@/lib/tiers";

/**
 * The whole board on one screen, no scrolling.
 *
 * That constraint drives everything here: the grid is 12 columns by exactly
 * ROWS rows, each row a 1fr slice of whatever height is left after the header,
 * so 100 slots always land inside the viewport no matter how tall it is.
 * Size is still the reward — #1 is the widest card and sits dead centre — but
 * every tier is budgeted in rows rather than pixels.
 *
 * Six size tiers, so paying more visibly buys more of the page rather than
 * just a lower number. The budget is exact: 12 cols x 16 rows = 192 cells,
 * and the tiers below consume all 192.
 *
 *   #1        6 x 4 = 24    centre of the top row
 *   #2-#3     3 x 4 = 24    flanking it
 *   #4-#6     4 x 2 = 24
 *   #7-#12    2 x 2 = 24
 *   #13-#20   2 x 1 = 16
 *   #21-#100  1 x 1 = 80
 */
export const ROWS = 16;

type Size = "hero" | "podium" | "large" | "medium" | "compact" | "tiny";

function sizeFor(rank: number): Size {
  if (rank === 1) return "hero";
  if (rank <= 3) return "podium";
  if (rank <= 6) return "large";
  if (rank <= 12) return "medium";
  if (rank <= 20) return "compact";
  return "tiny";
}

/**
 * The top three are placed explicitly so #1 lands in the middle. Everything
 * else flows. Below md the placement is dropped and the page scrolls normally —
 * 100 slots in a phone viewport would be unreadable.
 */
function spanFor(rank: number, size: Size) {
  if (rank === 1) {
    return "col-span-4 row-span-3 md:col-start-4 md:col-span-6 md:row-start-1 md:row-span-4";
  }
  if (rank === 2) {
    return "col-span-2 row-span-2 md:col-start-1 md:col-span-3 md:row-start-1 md:row-span-4";
  }
  if (rank === 3) {
    return "col-span-2 row-span-2 md:col-start-10 md:col-span-3 md:row-start-1 md:row-span-4";
  }
  if (size === "large") return "col-span-4 row-span-2";
  if (size === "medium") return "col-span-2 row-span-2";
  if (size === "compact") return "col-span-2";
  return "col-span-1";
}

/** Served from our own origin, with a generated letter tile as the fallback. */
function faviconFor(url: string) {
  return `/api/icon?domain=${encodeURIComponent(displayDomain(url))}`;
}

function Logo({ row, className }: { row: BoardRow; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={row.logo_url ?? faviconFor(row.url)}
      alt=""
      // Not lazy: the board never scrolls, so every icon is above the fold.
      // Deferring them only delays the whole page.
      fetchPriority="high"
      className={`shrink-0 rounded-md bg-bg object-contain p-0.5 ring-1 ring-edge ${className}`}
    />
  );
}

function FilledBox({ row }: { row: BoardRow }) {
  const next = tierToBeat(row.price_cents);
  const size = sizeFor(row.rank);
  const featured = row.rank <= 3;
  const withTagline = size === "hero" || size === "podium" || size === "large";
  const withFooter = size === "hero" || size === "podium";

  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener nofollow"
      className={`group relative isolate flex min-h-0 flex-col overflow-hidden rounded-xl border bg-panel card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:card-shadow-lift ${
        featured ? "border-gold-line" : "border-edge"
      } ${size === "tiny" ? "p-1" : size === "compact" ? "px-2 py-1.5" : "p-3"} ${spanFor(
        row.rank,
        size,
      )}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`tnum leading-none font-semibold ${
            size === "hero"
              ? "text-3xl text-gold"
              : size === "podium"
                ? "text-xl text-gold"
                : "text-[10px] text-muted"
          }`}
        >
          {row.rank}
        </span>

        {size !== "tiny" && size !== "compact" && (
          <span
            className={`tnum rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
              featured ? "bg-gold-soft text-gold" : "bg-faint text-muted"
            }`}
          >
            {formatPrice(row.price_cents)}
          </span>
        )}
      </div>

      {size === "tiny" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Logo row={row} className="size-5" />
        </div>
      ) : size === "compact" ? (
        <div className="mt-auto flex min-w-0 items-center gap-1.5">
          <Logo row={row} className="size-5" />
          <span className="truncate text-[11px] font-medium">{row.name}</span>
        </div>
      ) : (
        <div className={`min-w-0 ${withFooter ? "mt-2" : "mt-auto"}`}>
          <Logo
            row={row}
            className={`mb-1.5 ${
              size === "hero"
                ? "size-10"
                : size === "podium"
                  ? "size-8"
                  : size === "large"
                    ? "size-7"
                    : "size-6"
            }`}
          />
          <p
            className={`truncate font-semibold tracking-tight ${
              size === "hero"
                ? "text-xl"
                : size === "podium"
                  ? "text-[15px]"
                  : size === "large"
                    ? "text-sm"
                    : "text-[13px]"
            }`}
          >
            {row.name}
          </p>

          {withTagline && (
            <p
              className={`mt-0.5 text-muted ${size === "hero" ? "line-clamp-2 text-[13px]" : size === "podium" ? "line-clamp-2 text-xs" : "line-clamp-1 text-xs"}`}
            >
              {row.tagline}
            </p>
          )}

          {!withFooter && (
            <p className="tnum mt-1 truncate text-[10px] text-muted/80">
              {row.clicks_30d.toLocaleString()} clicks
            </p>
          )}
        </div>
      )}

      {withFooter && (
        <p className="tnum mt-auto truncate pt-2 text-[10px] text-muted/80">
          {displayDomain(row.url)} · {row.clicks_30d.toLocaleString()} clicks
        </p>
      )}

      {next && size !== "tiny" && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-fg px-1 py-1.5 text-center text-[10px] font-semibold text-bg-lift transition-transform duration-200 group-hover:translate-y-0">
          take #{row.rank} · {next.label}
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
      className={`group flex min-h-0 flex-col items-center justify-center rounded-xl border border-dashed border-edge-strong/50 bg-bg-lift/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-panel hover:card-shadow ${
        size === "tiny" ? "p-1" : "p-2"
      } ${spanFor(rank, size)}`}
    >
      <span className="tnum text-[10px] text-muted/40 transition-colors group-hover:text-accent">
        {rank}
      </span>
      {size !== "tiny" && (
        <span className="mt-0.5 text-[10px] text-muted/0 transition-colors group-hover:text-accent">
          claim {formatPrice(cents)}
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
    <div
      className="relative z-10 grid min-h-0 flex-1 auto-rows-[minmax(0,3.5rem)] grid-cols-4 gap-1.5 [grid-auto-flow:dense] md:auto-rows-auto md:grid-cols-12 md:grid-rows-[repeat(16,minmax(0,1fr))] md:gap-2"
    >
      {rows.map((row) => (
        <FilledBox key={row.id} row={row} />
      ))}
      {empty.map((rank) => (
        <EmptyBox key={rank} rank={rank} cents={floorCents} />
      ))}
    </div>
  );
}
