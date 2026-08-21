import Link from "next/link";
import type { BoardRow } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { formatPrice, tierToBeat } from "@/lib/tiers";

/**
 * The board as a theatre.
 *
 * The site is called frontrow, so the seating chart *is* the interface: a stage
 * at the top, the royal box alone above the front row, two boxes flanking it,
 * and seven rows curving back behind them. Paying more moves you forward.
 *
 * #1 sits alone deliberately. Three equal boxes across the front row blurred
 * who had actually won.
 *
 * Row sizes sum to exactly 100, and each row arcs like a real auditorium —
 * the middle of a row sits further from the stage than its edges.
 */

/**
 * Seats per row, front to back: 3 + 6 + 9 + 12 + 15 + 16 + 18 + 21 = 100.
 * Counts rise and seat sizes fall together, so each row is physically wider
 * than the one in front of it and the room fans out the way a real house does.
 */
const ROW_SIZES = [1, 2, 6, 9, 12, 15, 16, 18, 21];

/** Seat edge length per row, in px. Seats shrink as they retreat. */
const SEAT_PX = [0, 0, 70, 64, 59, 55, 51, 48, 45];

/** How far the centre of each row bows away from the stage, in px. */
const ROW_CURVE = [0, 0, 8, 10, 12, 14, 16, 17, 19];

function rowsOfRanks(): number[][] {
  const rows: number[][] = [];
  let rank = 1;
  for (const size of ROW_SIZES) {
    rows.push(Array.from({ length: size }, () => rank++));
  }
  return rows;
}

/** Position along the arc: 0 at the centre of the row, 1 at either end. */
function arcOffset(index: number, count: number, curve: number): number {
  if (count <= 1) return curve;
  const t = (index - (count - 1) / 2) / ((count - 1) / 2);
  return Math.round(curve * (1 - t * t));
}

function iconFor(url: string) {
  return `/api/icon?domain=${encodeURIComponent(displayDomain(url))}`;
}

/* ---------------------------------------------------------------- front row */

function Box({ row, apex = false }: { row: BoardRow; apex?: boolean }) {
  const next = tierToBeat(row.price_cents);

  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener nofollow"
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-panel p-2.5 transition-all duration-200 hover:-translate-y-1 hover:card-shadow-lift ${
        apex
          ? "w-[clamp(13rem,30vw,24rem)] border-gold bg-gold-soft shadow-[0_0_0_1px_rgba(232,200,119,0.5),0_18px_44px_-18px_rgba(154,107,5,0.45)]"
          : "w-[clamp(10rem,24vw,19rem)] border-gold-line card-shadow"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`tnum leading-none font-semibold text-gold ${apex ? "text-3xl" : "text-2xl"}`}>
          {row.rank}
        </span>
        <span className="tnum rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] leading-none text-gold">
          {formatPrice(row.price_cents)}
        </span>
      </div>

      <div className="mt-2 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.logo_url ?? iconFor(row.url)}
          alt=""
          fetchPriority="high"
          className="mb-1.5 size-8 rounded-lg bg-bg object-contain p-0.5 ring-1 ring-edge"
        />
        <p className="truncate text-[15px] font-semibold tracking-tight">{row.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.tagline}</p>
      </div>

      <p className="tnum mt-auto truncate pt-1.5 text-[10px] text-muted/80">
        {displayDomain(row.url)} · {row.clicks_30d.toLocaleString()} clicks
      </p>

      {next && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-fg px-2 py-1.5 text-center text-[10px] font-semibold text-bg-lift transition-transform duration-200 group-hover:translate-y-0">
          take this box · {next.label}/mo
        </span>
      )}
    </a>
  );
}

function EmptyBox({ rank, cents, apex = false }: { rank: number; cents: number; apex?: boolean }) {
  return (
    <Link
      href={`/submit?cents=${cents}`}
      className={`group flex flex-col items-center justify-center rounded-2xl border border-dashed bg-bg-lift/50 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:bg-panel hover:card-shadow ${
        apex ? "w-[clamp(13rem,30vw,24rem)] border-gold/60" : "w-[clamp(10rem,24vw,19rem)] border-gold-line/70"
      }`}
    >
      <span className="tnum text-2xl leading-none font-semibold text-muted/30 transition-colors group-hover:text-accent">
        {rank}
      </span>
      <span className="mt-1.5 text-[11px] text-muted/60 transition-colors group-hover:text-accent">
        {apex ? "the royal box" : "front row"} · {formatPrice(cents)}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------- seats */

function Seat({ row, size }: { row: BoardRow; size: number }) {
  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener nofollow"
      style={{ width: size, height: size }}
      className="group relative grid place-items-center rounded-xl border border-edge bg-panel card-shadow transition-all duration-150 hover:z-20 hover:-translate-y-1 hover:border-edge-strong hover:card-shadow-lift"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={row.logo_url ?? iconFor(row.url)}
        alt=""
        fetchPriority="high"
        style={{ width: size * 0.5, height: size * 0.5 }}
        className="rounded-md bg-bg object-contain p-0.5 ring-1 ring-edge"
      />
      <span className="tnum absolute top-0.5 left-1 text-[9px] leading-none text-muted/50">
        {row.rank}
      </span>

      {/* Detail lives in the tooltip: a seat this size can't carry it, and the
          chart reads better when only the shape of the room is visible. */}
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 hidden -translate-x-1/2 rounded-lg border border-edge bg-bg-lift px-2 py-1.5 whitespace-nowrap card-shadow group-hover:block">
        <span className="block text-[11px] font-semibold">{row.name}</span>
        <span className="tnum block text-[10px] text-muted">
          #{row.rank} · {formatPrice(row.price_cents)}/mo · {row.clicks_30d.toLocaleString()} clicks
        </span>
      </span>
    </a>
  );
}

function EmptySeat({ rank, size, cents }: { rank: number; size: number; cents: number }) {
  return (
    <Link
      href={`/submit?cents=${cents}`}
      style={{ width: size, height: size }}
      className="group relative grid place-items-center rounded-xl border border-dashed border-edge-strong/45 transition-all duration-150 hover:z-20 hover:-translate-y-1 hover:border-accent hover:bg-panel"
    >
      <span className="tnum text-[10px] text-muted/35 transition-colors group-hover:text-accent">
        {rank}
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 hidden -translate-x-1/2 rounded-lg border border-edge bg-bg-lift px-2 py-1.5 text-[10px] whitespace-nowrap card-shadow group-hover:block">
        Empty seat · from {formatPrice(cents)}/mo
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- the house */

export function Auditorium({ rows, floorCents }: { rows: BoardRow[]; floorCents: number }) {
  const byRank = new Map(rows.map((r) => [r.rank, r]));
  const [apex, flanks, ...backRows] = rowsOfRanks();

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 pt-2">
      {/* The royal box: one seat, alone, centred and lifted above the rest. */}
      <div className="flex w-full items-stretch justify-center">
        {apex.map((rank) => {
          const listing = byRank.get(rank);
          return listing ? (
            <Box key={rank} row={listing} apex />
          ) : (
            <EmptyBox key={rank} rank={rank} cents={floorCents} apex />
          );
        })}
      </div>

      {/* Front row: the only other seats with room for a pitch. */}
      <div className="flex w-full items-stretch justify-center gap-2 md:gap-3">
        {flanks.map((rank) => {
          const listing = byRank.get(rank);
          return listing ? (
            <Box key={rank} row={listing} />
          ) : (
            <EmptyBox key={rank} rank={rank} cents={floorCents} />
          );
        })}
      </div>

      <p className="mt-0.5 text-[10px] tracking-[0.18em] text-muted/50 uppercase">the house</p>

      {backRows.map((ranks, i) => {
        const rowIndex = i + 2;
        const size = SEAT_PX[rowIndex];
        const curve = ROW_CURVE[rowIndex];

        return (
          <div
            key={rowIndex}
            className="flex w-full justify-center gap-1.5"
            style={{ paddingBottom: curve }}
          >
            {ranks.map((rank, seatIndex) => {
              const listing = byRank.get(rank);
              const lift = arcOffset(seatIndex, ranks.length, curve);

              return (
                <span key={rank} style={{ transform: `translateY(${lift}px)` }} className="shrink-0">
                  {listing ? (
                    <Seat row={listing} size={size} />
                  ) : (
                    <EmptySeat rank={rank} size={size} cents={floorCents} />
                  )}
                </span>
              );
            })}
          </div>
        );
      })}

    </div>
  );
}
