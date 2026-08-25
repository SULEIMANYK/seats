"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BoardRow } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { Favicon } from "./Favicon";
import { BOARD_SIZE, ROWS, placeListings, rowOffset } from "@/lib/seating";

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
 * The plan itself — seat counts, sizes, curves — lives in lib/seating. Each
 * row arcs like a real auditorium: the middle sits further from the stage
 * than the ends.
 *
 * Filtering dims rather than removes. Seat numbers are absolute — seat 12 is
 * seat 12 whatever you are looking at — so pulling non-matching seats out
 * would renumber the room and destroy the thing the chart is for.
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

/* ---------------------------------------------------------------- front row */

function Box({ row, apex = false, dimmed = false }: { row: BoardRow; apex?: boolean; dimmed?: boolean }) {

  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener"
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-panel p-2.5 transition-all duration-200 hover:-translate-y-1 hover:card-shadow-lift ${
        apex
          ? "w-[clamp(13rem,30vw,24rem)] border-gold bg-gold-soft shadow-[0_0_0_1px_rgba(232,200,119,0.5),0_18px_44px_-18px_rgba(154,107,5,0.45)]"
          : "w-[clamp(10rem,24vw,19rem)] border-gold-line card-shadow"
      } ${dimmed ? "opacity-20 grayscale" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`tnum leading-none font-semibold text-gold ${apex ? "text-3xl" : "text-2xl"}`}>
          {row.rank}
        </span>
        <span className="tnum rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] leading-none text-gold">
          {row.clicks_24h.toLocaleString()} clicks
        </span>
      </div>

      {row.image_url && (
        <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-edge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.image_url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        </div>
      )}

      <div className="mt-2 min-w-0">
        <Favicon
          logoUrl={row.logo_url}
          domain={displayDomain(row.url)}
          className="mb-1.5 size-8 rounded-lg bg-bg object-contain p-0.5 ring-1 ring-edge"
        />
        <p className="truncate text-[15px] font-semibold tracking-tight">{row.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.tagline}</p>
        {row.pricing_model && (
          <span className="mt-1 inline-block rounded-full bg-faint px-2 py-0.5 text-[10px] text-muted">
            {row.pricing_model}
          </span>
        )}
      </div>

      <p className="tnum mt-auto truncate pt-1.5 text-[10px] text-muted/80">
        {displayDomain(row.url)} · {row.clicks_24h.toLocaleString()} clicks today
      </p>

    </a>
  );
}

function EmptyBox({ seat, apex = false }: { seat: number; apex?: boolean }) {
  return (
    <Link
      href="/submit"
      className={`group flex flex-col items-center justify-center rounded-2xl border border-dashed bg-bg-lift/50 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:bg-panel hover:card-shadow ${
        apex ? "w-[clamp(13rem,30vw,24rem)] border-gold/60" : "w-[clamp(10rem,24vw,19rem)] border-gold-line/70"
      }`}
    >
      <span className="tnum text-2xl leading-none font-semibold text-muted/30 transition-colors group-hover:text-accent">
        {seat}
      </span>
      <span className="mt-1.5 text-[11px] text-muted/60 transition-colors group-hover:text-accent">
{apex ? "the royal box" : "front row"} · earn it
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------- seats */

function Seat({
  row,
  seat,
  width,
  height,
  dimmed,
}: {
  row: BoardRow;
  seat: number;
  width: string;
  height: number;
  dimmed: boolean;
}) {
  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener"
      style={{ width, height }}
      className={`group relative flex flex-col items-center justify-center gap-1 rounded-xl border border-edge bg-panel card-shadow transition-all duration-200 hover:z-20 hover:-translate-y-1 hover:border-edge-strong hover:card-shadow-lift ${
        dimmed ? "opacity-20 grayscale" : ""
      }`}
    >
      <Favicon
        logoUrl={row.logo_url}
        domain={displayDomain(row.url)}
        style={{ width: height * 0.44, height: height * 0.44 }}
        className="rounded-md bg-bg object-contain p-0.5 ring-1 ring-edge"
      />
      {height >= 55 && (
        <span className="w-full truncate px-1 text-center text-[10px] leading-none font-medium">
          {row.name}
        </span>
      )}
      <span className="tnum text-[9px] leading-none text-muted">
        {row.clicks_24h.toLocaleString()} {row.clicks_24h === 1 ? "click" : "clicks"}
      </span>
      <span className="tnum absolute top-1 left-1.5 rounded bg-bg/70 px-1 text-[8px] leading-[1.4] font-medium text-muted backdrop-blur-sm">
        {seat}
      </span>

      {/* Detail lives in the tooltip: a seat this size can't carry it, and the
          chart reads better when only the shape of the room is visible. */}
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 hidden -translate-x-1/2 rounded-lg border border-edge bg-bg-lift px-2 py-1.5 whitespace-nowrap card-shadow group-hover:block">
        <span className="block text-[11px] font-semibold">{row.name}</span>
        <span className="tnum block text-[10px] text-muted">
          seat {row.rank} · {row.clicks_24h.toLocaleString()} clicks today
        </span>
      </span>
    </a>
  );
}

function EmptySeat({ seat, width, height }: { seat: number; width: string; height: number }) {
  return (
    <Link
      href={`/submit?seat=${seat}`}
      style={{ width, height }}
      className="group relative flex flex-col items-center justify-center gap-1 rounded-xl bg-[#14141a]/[0.03] ring-1 ring-black/[0.025] transition-all duration-200 hover:z-20 hover:-translate-y-1 hover:bg-panel hover:shadow-[0_10px_24px_-12px_rgba(20,20,26,0.3)] hover:ring-accent"
    >
      <span className="text-[10px] leading-none text-muted/0 transition-colors group-hover:text-accent">
        claim
      </span>
      <span className="tnum text-[13px] leading-none font-semibold text-muted/35 transition-colors group-hover:text-accent">
        {seat}
      </span>
      <span className="text-[9px] leading-none text-transparent transition-colors group-hover:text-accent">
        claim
      </span>
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 hidden -translate-x-1/2 rounded-lg border border-edge bg-bg-lift px-2 py-1.5 text-[10px] whitespace-nowrap card-shadow group-hover:block">
        Seat {seat} — claim it
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- the house */

export function Auditorium({ rows }: { rows: BoardRow[] }) {
  const [active, setActive] = useState<string | null>(null);

  // Only categories actually on the board — a chip that filters to nothing
  // is worse than no chip.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const isDimmed = (row: BoardRow) => active !== null && row.category !== active;

  // Seats are assigned by price bracket, not by raw ordering, so a listing
  // never appears in a row it has not paid for.
  const seats = placeListings(rows);
  const bySeat = new Map<number, BoardRow>();
  for (const row of rows) {
    const seat = seats.get(row.id);
    if (seat) bySeat.set(seat, row);
  }

  const [, , ...houseRows] = ROWS;

  return (
    <div className="house relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-[2.5rem] pt-2">
      {/* The royal box: one seat, alone, centred and lifted above the rest. */}
      <div className="flex w-full items-stretch justify-center">
        {bySeat.get(1) ? (
          <Box row={bySeat.get(1)!} apex dimmed={isDimmed(bySeat.get(1)!)} />
        ) : (
          <EmptyBox seat={1} apex />
        )}
      </div>

      {/* Front row: the only other seats with room for a pitch. */}
      <div className="flex w-full items-stretch justify-center gap-2 md:gap-3">
        {[2, 3].map((seat) =>
          bySeat.get(seat) ? (
            <Box key={seat} row={bySeat.get(seat)!} dimmed={isDimmed(bySeat.get(seat)!)} />
          ) : (
            <EmptyBox key={seat} seat={seat} />
          ),
        )}
      </div>

      {categories.length > 1 ? (
        <div className="mt-0.5 mb-0.5 flex max-w-full flex-wrap items-center justify-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActive(null)}
            className={`rounded-full border px-2.5 py-1 text-[10px] whitespace-nowrap transition ${
              active === null
                ? "border-fg bg-fg text-bg-lift"
                : "border-edge bg-panel text-muted hover:border-edge-strong"
            }`}
          >
            All {rows.length}
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setActive(active === name ? null : name)}
              className={`tnum rounded-full border px-2.5 py-1 text-[10px] whitespace-nowrap transition ${
                active === name
                  ? "border-fg bg-fg text-bg-lift"
                  : "border-edge bg-panel text-muted hover:border-edge-strong"
              }`}
            >
              {name} {count}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-0.5 mb-0.5 text-[10px] tracking-[0.22em] text-muted/45 uppercase">
          seats {rowOffset(2)}–{BOARD_SIZE}
        </p>
      )}

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
                          <Seat
                            row={listing}
                            seat={seat}
                            width={row.widthCss}
                            height={row.heightPx}
                            dimmed={isDimmed(listing)}
                          />
                        ) : (
                          <EmptySeat seat={seat} width={row.widthCss} height={row.heightPx} />
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
