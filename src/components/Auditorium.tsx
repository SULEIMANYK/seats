import Link from "next/link";
import type { BoardRow } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { ROWS, placeListings, rowOffset } from "@/lib/seating";
import { formatPrice, tierToBeat } from "@/lib/tiers";

/**
 * The board as a theatre.
 *
 * The site is called seats.lol, so the seating chart *is* the interface: a stage
 * at the top, the royal box alone above the front row, two boxes flanking it,
 * and ten rows curving back behind them. Paying more moves you forward.
 *
 * #1 sits alone deliberately. Three equal boxes across the front row blurred
 * who had actually won.
 *
 * The plan itself — seat counts, row prices, sizes — lives in lib/seating so
 * placement and pricing cannot drift apart. Each row arcs like a real
 * auditorium: the middle sits further from the stage than the ends.
 */

/** Width of an aisle, in px. */
const AISLE = 18;

/**
 * Split a row into three blocks with aisles between them. This is the single
 * detail that makes the chart read as a room rather than a grid of dots — and
 * the centre block is the widest, as it is in a real house.
 */
function intoBlocks(items: number[]): number[][] {
  const base = Math.floor(items.length / 3);
  const sizes = [base, base, base];
  const order = [1, 0, 2];
  for (let i = 0; i < items.length % 3; i++) sizes[order[i]]++;

  const out: number[][] = [];
  let cursor = 0;
  for (const size of sizes) {
    out.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return out;
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

function EmptyBox({ seat, cents, apex = false }: { seat: number; cents: number; apex?: boolean }) {
  return (
    <Link
      href={`/submit?cents=${cents}`}
      className={`group flex flex-col items-center justify-center rounded-2xl border border-dashed bg-bg-lift/50 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:bg-panel hover:card-shadow ${
        apex ? "w-[clamp(13rem,30vw,24rem)] border-gold/60" : "w-[clamp(10rem,24vw,19rem)] border-gold-line/70"
      }`}
    >
      <span className="tnum text-2xl leading-none font-semibold text-muted/30 transition-colors group-hover:text-accent">
        {seat}
      </span>
      <span className="mt-1.5 text-[11px] text-muted/60 transition-colors group-hover:text-accent">
        {apex ? "the royal box" : "front row"} · {formatPrice(cents)}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------- seats */

function Seat({ row, seat, size }: { row: BoardRow; seat: number; size: number }) {
  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener nofollow"
      style={{ width: size, height: size }}
      className="group relative flex flex-col items-center justify-center gap-1 rounded-xl border border-edge bg-panel card-shadow transition-all duration-150 hover:z-20 hover:-translate-y-1 hover:border-edge-strong hover:card-shadow-lift"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={row.logo_url ?? iconFor(row.url)}
        alt=""
        fetchPriority="high"
        style={{ width: size * 0.42, height: size * 0.42 }}
        className="rounded-md bg-bg object-contain p-0.5 ring-1 ring-edge"
      />
      <span className="tnum text-[10px] leading-none font-medium text-muted">
        {formatPrice(row.price_cents)}
      </span>
      <span className="tnum absolute top-0.5 left-1 text-[8px] leading-none text-muted/45">
        {seat}
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

function EmptySeat({ seat, size, cents }: { seat: number; size: number; cents: number }) {
  return (
    <Link
      href={`/submit?cents=${cents}`}
      style={{ width: size, height: size }}
      className="group relative flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#14141a]/[0.026] ring-1 ring-black/[0.02] transition-all duration-150 hover:z-20 hover:-translate-y-1 hover:bg-panel hover:ring-accent"
    >
      <span className="tnum text-[11px] leading-none text-muted/45 transition-colors group-hover:text-accent">
        {formatPrice(cents)}
      </span>
      <span className="tnum absolute top-0.5 left-1 text-[8px] leading-none text-muted/25">
        {seat}
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 hidden -translate-x-1/2 rounded-lg border border-edge bg-bg-lift px-2 py-1.5 text-[10px] whitespace-nowrap card-shadow group-hover:block">
        Empty seat · from {formatPrice(cents)}/mo
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- the house */

export function Auditorium({ rows }: { rows: BoardRow[] }) {
  // Seats are assigned by price bracket, not by raw ordering, so a listing
  // never appears in a row it has not paid for.
  const seats = placeListings(rows);
  const bySeat = new Map<number, BoardRow>();
  for (const row of rows) {
    const seat = seats.get(row.id);
    if (seat) bySeat.set(seat, row);
  }

  const [apexRow, frontRow, ...houseRows] = ROWS;

  return (
    <div className="house relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-[2.5rem] pt-2">
      {/* The royal box: one seat, alone, centred and lifted above the rest. */}
      <div className="flex w-full items-stretch justify-center">
        {bySeat.get(1) ? (
          <Box row={bySeat.get(1)!} apex />
        ) : (
          <EmptyBox seat={1} cents={apexRow.askingCents} apex />
        )}
      </div>

      {/* Front row: the only other seats with room for a pitch. */}
      <div className="flex w-full items-stretch justify-center gap-2 md:gap-3">
        {[2, 3].map((seat) =>
          bySeat.get(seat) ? (
            <Box key={seat} row={bySeat.get(seat)!} />
          ) : (
            <EmptyBox key={seat} seat={seat} cents={frontRow.askingCents} />
          ),
        )}
      </div>

      <p className="mt-0.5 mb-0.5 text-[10px] tracking-[0.22em] text-muted/45 uppercase">
        the house
      </p>

      {houseRows.map((row, i) => {
        const rowIndex = i + 2;
        const offset = rowOffset(rowIndex);
        const seatNumbers = Array.from({ length: row.seats }, (_, n) => offset + n);
        let seatIndex = -1;

        return (
          <div
            key={row.label}
            className="flex w-full items-center justify-center"
            style={{ paddingBottom: row.curvePx }}
          >
            <span className="tnum w-5 pr-1.5 text-right text-[9px] text-muted/35">
              {row.label}
            </span>

            {intoBlocks(seatNumbers).map((block, blockIndex) => (
              <span key={blockIndex} className="flex items-center">
                {blockIndex > 0 && <span aria-hidden style={{ width: AISLE }} />}
                <span className="flex gap-1">
                  {block.map((seat) => {
                    seatIndex += 1;
                    const listing = bySeat.get(seat);
                    const lift = arcOffset(seatIndex, row.seats, row.curvePx);

                    return (
                      <span
                        key={seat}
                        style={{ transform: `translateY(${lift}px)` }}
                        className="shrink-0"
                      >
                        {listing ? (
                          <Seat row={listing} seat={seat} size={row.sizePx} />
                        ) : (
                          <EmptySeat seat={seat} size={row.sizePx} cents={row.askingCents} />
                        )}
                      </span>
                    );
                  })}
                </span>
              </span>
            ))}

            <span className="tnum w-5 pl-1.5 text-[9px] text-muted/35">{row.label}</span>
          </div>
        );
      })}
    </div>
  );
}
