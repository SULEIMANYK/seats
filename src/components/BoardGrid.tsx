import Link from "next/link";
import type { BoardRow } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { BOARD_SIZE, formatPrice, tierToBeat } from "@/lib/tiers";

/**
 * All 100 slots, always. Empty boxes are as much the point as full ones —
 * a board with 82 visible gaps says "there's room" and a full one says
 * "you'll have to outpay someone", without a line of copy either way.
 *
 * The top three get bigger cells, so rank is legible at a glance instead of
 * having to be read off a number.
 */
function cellSpan(rank: number) {
  // The top three are the front row: same size, so they read as a set.
  // A single-height cell can't fit a tagline without clipping it.
  return rank <= 3 ? "col-span-2 row-span-2" : "";
}

function FilledBox({ row }: { row: BoardRow }) {
  const next = tierToBeat(row.price_cents);
  const featured = row.rank <= 3;
  const first = row.rank === 1;

  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener nofollow"
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 transition-colors ${cellSpan(
        row.rank,
      )} ${
        featured
          ? `bg-gradient-to-br to-transparent hover:border-gold/60 ${
              first ? "border-gold/40 from-gold/[0.10]" : "border-gold/25 from-gold/[0.05]"
            }`
          : "border-edge bg-panel hover:border-muted hover:bg-panel-hover"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`tnum font-semibold ${featured ? "text-2xl" : "text-xs"} ${
            featured ? "text-gold" : "text-muted"
          }`}
        >
          {row.rank}
        </span>
        {row.status === "past_due" && (
          <span className="rounded border border-gold/40 px-1 text-[9px] leading-tight text-gold">
            !
          </span>
        )}
      </div>

      <div className="min-w-0">
        {row.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.logo_url}
            alt=""
            className={`mb-2 rounded-lg border border-edge object-cover ${featured ? "size-10" : "size-7"}`}
          />
        ) : (
          <span
            className={`mb-2 grid place-items-center rounded-lg border border-edge bg-bg font-semibold text-muted ${
              featured ? "size-10 text-lg" : "size-7 text-xs"
            }`}
          >
            {row.name.charAt(0).toUpperCase()}
          </span>
        )}

        <p className={`truncate font-medium ${featured ? "text-base" : "text-sm"}`}>{row.name}</p>

        {/* Only the front row has the height for a tagline. */}
        {featured && (
          <>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{row.tagline}</p>
            <p className="mt-1 truncate text-xs text-muted/70">{displayDomain(row.url)}</p>
          </>
        )}

        <p className="tnum mt-1 truncate text-xs text-muted">
          {featured
            ? `${formatPrice(row.price_cents)}/mo · ${row.clicks_30d.toLocaleString()} clicks`
            : formatPrice(row.price_cents)}
        </p>
      </div>

      {/* Slides up on hover — the price to take this exact spot. */}
      {next && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-fg px-2 py-1.5 text-center text-[11px] font-medium text-bg transition-transform group-hover:translate-y-0">
          take #{row.rank} for {next.label}
        </span>
      )}
    </a>
  );
}

function EmptyBox({ rank, cents }: { rank: number; cents: number }) {
  return (
    <Link
      href={`/submit?cents=${cents}`}
      className="group flex flex-col justify-between rounded-xl border border-dashed border-edge p-3 transition-colors hover:border-accent hover:bg-panel"
    >
      <span className="tnum text-xs text-muted/60">{rank}</span>
      <span className="text-xs text-muted/50 transition-colors group-hover:text-accent">
        claim
      </span>
    </Link>
  );
}

export function BoardGrid({ rows, floorCents }: { rows: BoardRow[]; floorCents: number }) {
  const empty = Array.from(
    { length: Math.max(0, BOARD_SIZE - rows.length) },
    (_, i) => rows.length + i + 1,
  );

  return (
    <div className="grid auto-rows-[minmax(0,7rem)] grid-cols-3 gap-2 [grid-auto-flow:dense] sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {rows.map((row) => (
        <FilledBox key={row.id} row={row} />
      ))}
      {empty.map((rank) => (
        <EmptyBox key={rank} rank={rank} cents={floorCents} />
      ))}
    </div>
  );
}
