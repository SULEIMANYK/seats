"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BoardRow } from "@/lib/db";
import { BOARD_SIZE } from "@/lib/seating";
import { displayDomain } from "@/lib/slug";
import { Favicon } from "./Favicon";
import { ReportButton } from "./ReportButton";

/**
 * The board, as a ranked list.
 *
 * This replaced a seating chart. The chart drew all fifty seats whether or
 * not anyone held them, so at one listing it was ninety-four percent empty
 * rectangles and read as a broken page. A list only draws what exists, and
 * the free seats become one line rather than forty-nine ghosts — so the
 * board looks deliberate at any occupancy, which is the whole problem with
 * a house that empties every night.
 *
 * The theatre survives in the language — seats, the front row, the house —
 * just not in the layout.
 */

function Row({ row, featured }: { row: BoardRow; featured: boolean }) {
  return (
    <li className="group flex items-stretch gap-1.5">
      <a
        href={`/r/${row.slug}`}
        target="_blank"
        rel="noopener"
        className={`flex flex-1 items-center gap-3 rounded-xl border px-3 transition-all duration-150 hover:-translate-y-px hover:card-shadow ${
          featured
            ? "border-gold-line bg-gold-soft py-3.5"
            : "border-edge bg-panel py-2.5 hover:border-edge-strong"
        }`}
      >
        <span
          className={`tnum w-6 shrink-0 text-center font-semibold ${
            featured ? "text-[15px] text-gold" : "text-[12px] text-muted"
          }`}
        >
          {row.rank}
        </span>

        <Favicon
          logoUrl={row.logo_url}
          domain={displayDomain(row.url)}
          className={`shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge ${
            featured ? "size-10" : "size-8"
          }`}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={`truncate font-semibold ${featured ? "text-[15px]" : "text-[13.5px]"}`}>
              {row.name}
            </span>
            <span className="hidden shrink-0 text-[11px] text-muted/70 sm:block">
              {displayDomain(row.url)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="truncate text-[12px] text-muted">{row.tagline}</span>
          </span>
        </span>

        {row.category && (
          <span className="hidden shrink-0 rounded-full bg-faint px-2 py-0.5 text-[10px] text-muted lg:block">
            {row.category}
          </span>
        )}

        <span className="shrink-0 text-right">
          <span className="tnum block text-[13px] font-semibold">{row.clicks_24h}</span>
          <span className="block text-[9px] tracking-wide text-muted uppercase">clicks</span>
        </span>
      </a>

      <span className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
        <ReportButton listingId={row.id} />
      </span>
    </li>
  );
}

export function Board({ rows }: { rows: BoardRow[] }) {
  const [active, setActive] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const shown = active === null ? rows : rows.filter((r) => r.category === active);
  const free = BOARD_SIZE - rows.length;

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-edge bg-panel p-12 text-center card-shadow">
        <p className="text-[17px] font-semibold">The house is empty.</p>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          All {BOARD_SIZE} seats are free. Take the front row — it costs nothing, and
          tonight it clears and someone else gets the chance.
        </p>
        <Link
          href="/submit?seat=1"
          className="mt-6 inline-block rounded-xl bg-fg px-5 py-2.5 text-[13px] font-semibold text-bg-lift transition hover:-translate-y-0.5"
        >
          Take seat 1
        </Link>
      </div>
    );
  }

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActive(null)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
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
              className={`tnum rounded-full border px-2.5 py-1 text-[11px] transition ${
                active === name
                  ? "border-fg bg-fg text-bg-lift"
                  : "border-edge bg-panel text-muted hover:border-edge-strong"
              }`}
            >
              {name} {count}
            </button>
          ))}
        </div>
      )}

      <ol className="space-y-1.5">
        {shown.map((row) => (
          <Row key={row.id} row={row} featured={row.rank <= 3} />
        ))}
      </ol>

      {/* One line, not forty-nine empty boxes. */}
      {free > 0 && active === null && (
        <Link
          href="/submit"
          className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-dashed border-edge-strong/70 px-4 py-3.5 transition-all duration-150 hover:-translate-y-px hover:border-accent hover:bg-panel"
        >
          <span className="text-[13px] text-muted">
            <span className="tnum font-semibold text-fg">{free}</span>{" "}
            {free === 1 ? "seat" : "seats"} still free
          </span>
          <span className="text-[12px] font-medium text-accent">Claim one →</span>
        </Link>
      )}
    </div>
  );
}
