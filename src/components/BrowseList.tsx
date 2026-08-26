"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { displayDomain } from "@/lib/slug";
import { Favicon } from "./Favicon";

export type BrowseRow = {
  id: string;
  slug: string;
  name: string;
  url: string;
  domain: string;
  tagline: string;
  logo_url: string | null;
  image_url: string | null;
  category: string | null;
  pricing_model: string | null;
  seat_day: string | null;
  created_at: string;
  days_on_board: number;
  clicks_total: number;
  is_featured: boolean;
};

type Payload = { rows: BrowseRow[]; total: number; hasMore: boolean };

/**
 * Every product that has ever held a seat, loaded a page at a time.
 *
 * The whole history used to arrive in one response and filter in the browser.
 * That is fine at six products and untenable at six thousand, and it made the
 * first paint wait for the slowest row.
 */
export function BrowseList({ initial }: { initial: Payload }) {
  const [rows, setRows] = useState<BrowseRow[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const sentinel = useRef<HTMLDivElement | null>(null);
  // Guards against a stale response from an abandoned search overwriting the
  // results of a newer one.
  const requestId = useRef(0);

  const load = useCallback(
    async (nextPage: number, replace: boolean, q: string, cat: string | null) => {
      const mine = ++requestId.current;
      setBusy(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({ page: String(nextPage) });
        if (q) params.set("q", q);
        if (cat) params.set("category", cat);

        const res = await fetch(`/api/browse?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const data: Payload = await res.json();
        if (mine !== requestId.current) return;

        setRows((prev) => (replace ? data.rows : [...prev, ...data.rows]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch {
        if (mine === requestId.current) setFailed(true);
      } finally {
        if (mine === requestId.current) setBusy(false);
      }
    },
    [],
  );

  // Debounced, so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (query === "" && category === null && page === 0 && rows === initial.rows) return;
      load(0, true, query, category);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  // Load the next page when the sentinel comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || busy || failed) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) load(page + 1, false, query, category);
      },
      // Start fetching before it is on screen, so the list rarely stalls.
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, busy, failed, page, query, category, load]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, tagline or domain…"
          className="w-full min-w-0 rounded-xl border border-edge bg-panel px-3.5 py-2.5 text-[13px] text-fg placeholder:text-muted/70 outline-none transition focus:border-edge-strong sm:max-w-xs"
        />
        <div className="flex shrink-0 items-center gap-3">
          <select
            value={category ?? ""}
            onChange={(e) => setCategory(e.target.value || null)}
            aria-label="Filter by category"
            className="min-w-0 rounded-xl border border-edge bg-panel px-3 py-2.5 text-[13px] text-fg outline-none transition focus:border-edge-strong"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span className="tnum text-[11px] text-muted">
            {rows.length} of {total}
          </span>
        </div>
      </div>

      {rows.length === 0 && !busy ? (
        <p className="rounded-2xl border border-dashed border-edge-strong/60 p-8 text-center text-[13px] text-muted">
          {query || category ? "Nothing matches that." : "Nothing has ever been listed."}
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <a
                href={`/r/${r.slug}`}
                target="_blank"
                rel="noopener"
                className={`flex items-center gap-3 rounded-2xl border p-4 card-shadow transition-all duration-150 hover:-translate-y-0.5 ${
                  r.is_featured ? "border-gold-line bg-gold-soft" : "border-edge bg-panel"
                }`}
              >
                <Favicon
                  logoUrl={r.logo_url}
                  domain={displayDomain(r.url)}
                  className="size-9 shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-[14px] font-semibold">{r.name}</span>
                    {r.is_featured && (
                      <span className="rounded-full border border-gold-line px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold uppercase">
                        Featured
                      </span>
                    )}
                    {r.category && (
                      <span className="text-[11px] text-muted">{r.category}</span>
                    )}
                    {r.pricing_model && (
                      <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] text-gold">
                        {r.pricing_model}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">
                    {displayDomain(r.url)}
                  </span>
                </span>
                <span className="tnum shrink-0 text-right text-[11px] text-muted">
                  <span className="block">
                    {r.days_on_board} {r.days_on_board === 1 ? "day" : "days"}
                  </span>
                  <span className="block font-semibold text-fg">{r.clicks_total}</span>
                  <span className="block">clicks</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}

      {/* Watched by the observer; fetching starts before it is on screen. */}
      <div ref={sentinel} aria-hidden className="h-px" />

      <div className="py-6 text-center">
        {busy && <p className="text-[12px] text-muted">Loading…</p>}
        {failed && (
          <button
            onClick={() => load(page + 1, false, query, category)}
            className="rounded-xl border border-edge px-4 py-2 text-[12px] font-semibold"
          >
            Couldn&apos;t load more &mdash; try again
          </button>
        )}
        {!busy && !failed && !hasMore && rows.length > 0 && (
          <p className="text-[11px] text-muted/60">
            That&apos;s everything &mdash; {total} {total === 1 ? "product" : "products"}.
          </p>
        )}
      </div>

      {rows.length === 0 && !busy && (query || category) && (
        <p className="text-center">
          <Link href="/browse" className="text-[12px] text-accent hover:underline">
            Clear filters
          </Link>
        </p>
      )}
    </div>
  );
}
