"use client";

import { useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { formatMoney, priceToBeat } from "@/lib/bidding";
import { displayDomain } from "@/lib/slug";
import { Favicon } from "./Favicon";
import { BidModal } from "./BidModal";

export type Row = {
  id: string;
  slug: string;
  name: string;
  url: string;
  domain: string;
  tagline: string;
  logo_url: string | null;
  category: string | null;
  bid_cents: number;
  rank: number;
  clicks_total: number;
  clicks_24h: number;
  is_featured: boolean;
};

export function Leaderboard({
  allTime,
  today,
  myToken,
}: {
  allTime: Row[];
  today: Row[];
  myToken: string | null;
}) {
  const [view, setView] = useState<"all" | "today">("all");
  const [category, setCategory] = useState<string | null>(null);
  const [bidding, setBidding] = useState<Row | null>(null);

  const source = view === "all" ? allTime : today;

  const shown = useMemo(
    () => (category ? source.filter((r) => r.category === category) : source),
    [source, category],
  );

  // Only categories something is actually filed under; a chip that filters to
  // nothing is worse than no chip.
  const present = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of source) if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return CATEGORIES.filter((c) => counts.has(c)).map((c) => [c, counts.get(c)!] as const);
  }, [source]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* All-time against the last 24 hours. */}
        <div className="inline-flex rounded-full border border-edge bg-panel p-1">
          {(["all", "today"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
                view === v ? "bg-gold text-[#141413]" : "text-muted"
              }`}
            >
              {v === "all" ? "All-time" : "Today"}
            </button>
          ))}
        </div>
        <span className="tnum text-[12px] text-muted">
          {shown.length} {shown.length === 1 ? "listing" : "listings"}
        </span>
      </div>

      {present.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`min-h-9 rounded-full border px-3.5 py-2 text-[12px] transition ${
              category === null ? "border-fg bg-fg text-bg-lift" : "border-edge bg-panel text-muted"
            }`}
          >
            All {source.length}
          </button>
          {present.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setCategory(category === name ? null : name)}
              className={`tnum min-h-9 rounded-full border px-3.5 py-2 text-[12px] transition ${
                category === name ? "border-fg bg-fg text-bg-lift" : "border-edge bg-panel text-muted"
              }`}
            >
              {name} {count}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge-strong/60 p-12 text-center">
          <p className="text-[15px] font-semibold">
            {view === "today" ? "No bids in the last 24 hours." : "Nothing on the board yet."}
          </p>
          <p className="mt-1.5 text-[13px] text-muted">
            {view === "today" ? "The all-time board still stands." : "First bid takes #1."}
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {shown.map((r) => {
            const top3 = r.rank <= 3;
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition-all duration-150 ${
                  top3 ? "border-gold-line bg-gold-soft card-shadow" : "border-edge bg-panel card-shadow"
                }`}
              >
                <span
                  className={`tnum font-display w-10 shrink-0 text-center leading-none ${
                    top3 ? "text-[20px] text-gold" : "text-[15px] text-muted"
                  }`}
                >
                  {r.rank}
                </span>

                <Favicon
                  logoUrl={r.logo_url}
                  domain={displayDomain(r.url)}
                  className="size-10 shrink-0 rounded-xl bg-bg object-contain p-1 ring-1 ring-edge"
                />

                <a
                  href={`/r/${r.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="min-w-0 flex-1"
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-[15px] font-semibold">{r.name}</span>
                    {r.category && <span className="text-[11px] text-muted">{r.category}</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">{r.tagline}</span>
                  <span className="tnum mt-0.5 block truncate text-[11px] text-muted/70">
                    {displayDomain(r.url)} &middot; {r.clicks_total.toLocaleString()} clicks
                  </span>
                </a>

                <span className="shrink-0 text-right">
                  <span className="tnum block text-[15px] font-semibold">
                    {formatMoney(r.bid_cents)}
                  </span>
                  <button
                    onClick={() => setBidding(r)}
                    className="mt-1 rounded-full border border-gold-line px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-gold transition hover:bg-gold hover:text-[#141413]"
                  >
                    Outbid &rarr;
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <BidModal
        open={!!bidding}
        onClose={() => setBidding(null)}
        rank={bidding?.rank ?? null}
        name={bidding?.name ?? ""}
        currentCents={bidding?.bid_cents ?? 0}
        token={myToken}
      />

      {shown.length > 0 && (
        <p className="mt-6 text-center text-[11px] text-muted/60">
          #1 goes for {formatMoney(priceToBeat(shown[0]?.bid_cents ?? 0))}. Anything below it costs
          less.
        </p>
      )}
    </div>
  );
}
