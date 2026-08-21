import Link from "next/link";
import type { BoardRow } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { BOARD_SIZE, formatPrice, tierToBeat } from "@/lib/tiers";

/**
 * All 100 slots render, empty ones included — a board with 82 visible gaps
 * says "there's room" and a full one says "you'll have to outpay someone".
 *
 * Empty cells are deliberately near-invisible: at 80-odd of them they'd
 * otherwise out-shout the listings, which is the exact opposite of the job.
 */

/** Real brand marks. A wall of grey initials reads as a broken page. */
function faviconFor(url: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    displayDomain(url),
  )}&sz=128`;
}

function FilledBox({ row }: { row: BoardRow }) {
  const next = tierToBeat(row.price_cents);
  const featured = row.rank <= 3;

  return (
    <a
      href={`/r/${row.slug}`}
      target="_blank"
      rel="noopener nofollow"
      className={`group relative isolate flex flex-col overflow-hidden rounded-2xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 ${
        featured
          ? "col-span-2 row-span-2 border-gold/25 bg-gold-soft shadow-[0_0_0_1px_rgba(240,180,41,0.06),0_18px_40px_-24px_rgba(240,180,41,0.5)] hover:border-gold/50"
          : "border-edge bg-panel hover:border-edge-strong hover:bg-panel-hover"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`tnum leading-none font-semibold ${
            featured ? "text-[28px] text-gold" : "text-[11px] text-muted"
          }`}
        >
          {row.rank}
        </span>

        <span className="flex items-center gap-1">
          {row.status === "past_due" && (
            <span className="rounded-full border border-gold/40 px-1.5 py-0.5 text-[9px] leading-none text-gold">
              billing
            </span>
          )}
          <span
            className={`tnum rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
              featured ? "bg-gold/15 text-gold" : "bg-white/6 text-muted"
            }`}
          >
            {formatPrice(row.price_cents)}
          </span>
        </span>
      </div>

      <div className="mt-auto min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.logo_url ?? faviconFor(row.url)}
          alt=""
          loading="lazy"
          // White tile, not a dark one: most brand marks are black or near-black
          // and vanish completely against the panel background.
          className={`mb-2.5 rounded-xl bg-white object-contain p-1 ring-1 ring-white/10 ${
            featured ? "size-12 p-1.5" : "size-8"
          }`}
        />

        <p className={`truncate font-semibold tracking-tight ${featured ? "text-lg" : "text-[13px]"}`}>
          {row.name}
        </p>

        {featured ? (
          <>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{row.tagline}</p>
            <p className="tnum mt-2 text-[11px] text-muted/70">
              {displayDomain(row.url)} · {row.clicks_30d.toLocaleString()} clicks
            </p>
          </>
        ) : (
          <p className="tnum mt-0.5 truncate text-[11px] text-muted/70">
            {row.clicks_30d.toLocaleString()} clicks
          </p>
        )}
      </div>

      {next && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-fg px-2 py-2 text-center text-[11px] font-semibold text-bg transition-transform duration-200 group-hover:translate-y-0">
          take #{row.rank} · {next.label}/mo
        </span>
      )}
    </a>
  );
}

function EmptyBox({ rank, cents }: { rank: number; cents: number }) {
  return (
    <Link
      href={`/submit?cents=${cents}`}
      className="group relative flex items-center justify-center rounded-2xl border border-faint transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/5"
    >
      <span className="tnum absolute top-3.5 left-3.5 text-[11px] text-white/15 transition-colors group-hover:text-accent/70">
        {rank}
      </span>
      <span className="text-[11px] text-transparent transition-colors group-hover:text-accent">
        claim · {formatPrice(cents)}
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
    <div className="relative z-10 grid auto-rows-[minmax(0,8.5rem)] grid-cols-2 gap-2.5 [grid-auto-flow:dense] sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {rows.map((row) => (
        <FilledBox key={row.id} row={row} />
      ))}
      {empty.map((rank) => (
        <EmptyBox key={rank} rank={rank} cents={floorCents} />
      ))}
    </div>
  );
}
