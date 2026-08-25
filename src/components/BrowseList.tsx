"use client";

import { useMemo, useState } from "react";
import type { BrowseRow } from "@/app/browse/page";
import { Favicon } from "./Favicon";

/**
 * The full history of the board: every domain that has ever held a seat,
 * searchable and filterable by category. Unlike the daily board this list
 * doesn't reorder itself — it's a record, not a competition.
 */
export function BrowseList({ rows }: { rows: BrowseRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.tagline.toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q)
      );
    });
  }, [rows, query, category]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge-strong/60 p-10 text-center">
        <p className="text-[15px] font-semibold">Nothing has ever been listed.</p>
        <p className="mt-1.5 text-[13px] text-muted">
          The first seat is still waiting for someone to take it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, tagline or domain…"
          className="w-full min-w-0 rounded-xl border border-edge bg-panel px-3.5 py-2.5 text-[13px] text-fg placeholder:text-muted/70 outline-none transition focus:border-edge-strong sm:max-w-xs"
        />
        <span className="tnum shrink-0 text-[11px] text-muted">
          {shown.length} of {rows.length}
        </span>
      </div>

      {categories.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              category === null
                ? "border-fg bg-fg text-bg-lift"
                : "border-edge bg-panel text-muted"
            }`}
          >
            All {rows.length}
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setCategory(category === name ? null : name)}
              className={`tnum rounded-full border px-2.5 py-1 text-[11px] transition ${
                category === name
                  ? "border-fg bg-fg text-bg-lift"
                  : "border-edge bg-panel text-muted"
              }`}
            >
              {name} {count}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-edge-strong/60 p-8 text-center text-[13px] text-muted">
          Nothing matches that search.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {shown.map((r) => (
            <li key={r.id}>
              <a
                href={`/r/${r.slug}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 rounded-2xl border border-edge bg-panel p-3 card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:card-shadow-lift"
              >
                <Favicon
                  logoUrl={r.logo_url}
                  domain={r.domain}
                  className="size-9 shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="truncate text-[14px] font-semibold">{r.name}</span>
                    {r.category && (
                      <span className="hidden shrink-0 rounded-full bg-faint px-2 py-0.5 text-[10px] text-muted sm:inline">
                        {r.category}
                      </span>
                    )}
                    {r.pricing_model && (
                      <span className="hidden shrink-0 rounded-full border border-gold-line bg-gold-soft px-2 py-0.5 text-[10px] text-gold sm:inline">
                        {r.pricing_model}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">
                    {r.tagline || r.domain}
                  </span>
                </span>

                <span className="tnum hidden w-16 shrink-0 text-right text-[11px] text-muted sm:block">
                  {r.daysOnBoard} {r.daysOnBoard === 1 ? "day" : "days"}
                </span>

                <span className="shrink-0 text-right">
                  <span className="tnum block text-[13px] font-semibold">{r.clicksTotal}</span>
                  <span className="block text-[10px] text-muted">clicks</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
