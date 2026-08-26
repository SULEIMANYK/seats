import { formatMoney } from "@/lib/bidding";

export type Activity = { name: string; amount_cents: number; created_at: string };

/** "2m ago", and nothing more precise than the eye needs. */
function ago(iso: string, now: number): string {
  const secs = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

/**
 * Recent bids.
 *
 * Rendered on the server with a timestamp passed in, so the relative times do
 * not differ between what the server wrote and what the browser would compute
 * a moment later.
 */
export function ActivityFeed({ items, now }: { items: Activity[]; now: number }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-edge-strong/60 p-6 text-center text-[13px] text-muted">
        No bids yet. The first one goes straight to the top.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((a, i) => (
        <li
          key={`${a.created_at}-${i}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-panel px-3.5 py-2.5"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-green" />
            <span className="truncate text-[13px] font-semibold">{a.name}</span>
          </span>
          <span className="flex shrink-0 items-baseline gap-2.5">
            <span className="tnum text-[13px] font-semibold text-gold">
              {formatMoney(a.amount_cents)}
            </span>
            <span className="tnum text-[11px] text-muted/70">{ago(a.created_at, now)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
