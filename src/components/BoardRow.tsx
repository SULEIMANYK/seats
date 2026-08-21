import Link from "next/link";
import type { BoardRow as Row } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { formatPrice, tierToBeat } from "@/lib/tiers";

/** The top three get the visual treatment — they're what people pay to reach. */
function rankStyles(rank: number) {
  if (rank === 1) return "border-gold/40 bg-gradient-to-r from-gold/[0.07] to-transparent";
  if (rank <= 3) return "border-gold/20 bg-gold/[0.03]";
  return "border-edge bg-panel";
}

export function BoardRow({ row }: { row: Row }) {
  const next = tierToBeat(row.price_cents);
  const isFrontRow = row.rank <= 3;

  return (
    <li
      className={`group flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors hover:bg-panel-hover ${rankStyles(row.rank)}`}
    >
      <span
        className={`tnum w-10 shrink-0 text-right text-sm font-semibold ${
          isFrontRow ? "text-gold" : "text-muted"
        }`}
      >
        {row.rank}
      </span>

      {row.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.logo_url}
          alt=""
          className="size-9 shrink-0 rounded-lg border border-edge object-cover"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-edge bg-panel text-sm font-semibold text-muted">
          {row.name.charAt(0).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <a
          href={`/r/${row.slug}`}
          target="_blank"
          rel="noopener nofollow"
          className="flex items-baseline gap-2 hover:underline"
        >
          <span className="truncate font-medium">{row.name}</span>
          <span className="truncate text-xs text-muted">{displayDomain(row.url)}</span>
          {row.status === "past_due" && (
            <span className="shrink-0 rounded border border-gold/40 px-1.5 py-0.5 text-[10px] text-gold">
              payment issue
            </span>
          )}
        </a>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{row.tagline}</p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="tnum text-sm">{formatPrice(row.price_cents)}<span className="text-muted">/mo</span></div>
        <div className="tnum text-xs text-muted">{row.clicks_30d.toLocaleString()} clicks</div>
      </div>

      {next && (
        <Link
          href={`/submit?cents=${next.cents}`}
          className="hidden shrink-0 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-muted opacity-0 transition group-hover:opacity-100 hover:border-accent hover:text-fg md:block"
        >
          take #{row.rank} for {next.label}
        </Link>
      )}
    </li>
  );
}
