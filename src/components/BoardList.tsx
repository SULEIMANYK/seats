"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BoardRow } from "@/lib/db";
import { BOARD_SIZE, placeListings } from "@/lib/seating";
import { displayDomain } from "@/lib/slug";
import { Favicon } from "./Favicon";
import { ReportButton } from "./ReportButton";

/**
 * The board for narrow screens.
 *
 * The seating chart needs about 1200px before its widest row fits; below
 * that the seats shrink past the point where a logo is legible. Rather than
 * ship a chart nobody can read on a phone, small screens get the same board
 * as a ranked list — which is what a phone is good at anyway.
 */
export function BoardList({ rows }: { rows: BoardRow[] }) {
  const [active, setActive] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const shown = active === null ? rows : rows.filter((r) => r.category === active);

  // Seats nobody holds today. placeListings is the same mapping the chart
  // uses, so the two surfaces can never disagree about who sits where.
  const taken = new Set(placeListings(rows).values());
  const free = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1).filter((n) => !taken.has(n));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge-strong/60 p-10 text-center">
        <p className="text-[15px] font-semibold">The house is empty.</p>
        <p className="mt-1.5 text-[13px] text-muted">
          {BOARD_SIZE} seats open. The most clicked sit at the front.
        </p>
        <Link
          href="/submit"
          className="mt-5 inline-block rounded-xl bg-fg px-4 py-2.5 text-[13px] font-semibold text-bg-lift"
        >
          Take the first seat
        </Link>
      </div>
    );
  }

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActive(null)}
            className={`min-h-9 rounded-full border px-3.5 py-2 text-[12px] transition ${
              active === null
                ? "border-fg bg-fg text-bg-lift"
                : "border-edge bg-panel text-muted"
            }`}
          >
            All {rows.length}
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setActive(active === name ? null : name)}
              className={`tnum min-h-9 rounded-full border px-3.5 py-2 text-[12px] transition ${
                active === name
                  ? "border-fg bg-fg text-bg-lift"
                  : "border-edge bg-panel text-muted"
              }`}
            >
              {name} {count}
            </button>
          ))}
        </div>
      )}

      <ol className="space-y-1.5">
        {shown.map((row) => {
          const featured = row.rank <= 3;
          return (
            <li key={row.id} className="flex items-center gap-1">
              <a
                href={`/r/${row.slug}`}
                target="_blank"
                rel="noopener"
                className={`flex flex-1 items-center gap-3 rounded-2xl border p-3 transition-colors ${
                  featured
                    ? "border-gold-line bg-gold-soft card-shadow"
                    : "border-edge bg-panel card-shadow"
                }`}
              >
                <span
                  className={`tnum w-7 shrink-0 text-center text-[13px] font-semibold ${
                    featured ? "text-gold" : "text-muted"
                  }`}
                >
                  {row.rank}
                </span>

                <Favicon
                  logoUrl={row.logo_url}
                  domain={displayDomain(row.url)}
                  className="size-9 shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{row.name}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">
                    {row.tagline}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="tnum block text-[13px] font-semibold">{row.clicks_24h}</span>
                  <span className="block text-[10px] text-muted">clicks</span>
                </span>
              </a>

              <ReportButton listingId={row.id} />
            </li>
          );
        })}
      </ol>

      {/* The free seats. Without these a phone showed only the handful of
          listings that exist and nothing else -- no sense that this is a
          fifty-seat house, and no way to pick a seat, which is the one thing
          the product actually does. The chart carries that on desktop; on a
          phone it has to be a grid. */}
      {free.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-baseline justify-between text-[11px] tracking-wide text-muted uppercase">
            <span>Free seats</span>
            <span className="tnum normal-case">
              {free.length} of {BOARD_SIZE} open
            </span>
          </h2>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
            {free.map((seat) => (
              <Link
                key={seat}
                href={`/submit?seat=${seat}`}
                aria-label={`Claim seat ${seat}`}
                className="tnum font-display flex h-11 items-center justify-center rounded-xl bg-faint text-[13px] text-muted ring-1 ring-edge transition active:bg-gold active:text-[#141413]"
              >
                {seat}
              </Link>
            ))}
          </div>

          <Link
            href="/submit"
            className="pill mt-4 block bg-gold py-3 text-center text-[14px] font-semibold text-[#141413]"
          >
            Take a seat &mdash; free
          </Link>
        </section>
      )}

      <p className="tnum mt-5 text-center text-[11px] text-muted/60">
        {rows.length} of {BOARD_SIZE} seats taken &middot; cleared at midnight UTC
      </p>
    </div>
  );
}
