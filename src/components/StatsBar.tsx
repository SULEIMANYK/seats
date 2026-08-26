import { formatMoney } from "@/lib/bidding";

/**
 * Live numbers.
 *
 * Every figure here is measured. There is no "N online" because nothing in
 * this app tracks concurrent sessions, and inventing one would be inventing
 * social proof -- which is the one number on a leaderboard nobody can check
 * and everybody would rely on.
 */
export function StatsBar({
  visitors,
  hoursSinceLaunch,
  revenueCents,
  listings,
}: {
  visitors: number;
  hoursSinceLaunch: number;
  revenueCents: number;
  listings: number;
}) {
  const items: [string, string][] = [
    [visitors.toLocaleString(), "visitors"],
    [hoursSinceLaunch.toLocaleString(), hoursSinceLaunch === 1 ? "hour live" : "hours live"],
    [formatMoney(revenueCents), "bid so far"],
    [listings.toLocaleString(), listings === 1 ? "listing" : "listings"],
  ];

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([value, label]) => (
        <div key={label} className="rounded-2xl border border-edge bg-panel px-4 py-3">
          <dt className="text-[11px] tracking-wide text-muted uppercase">{label}</dt>
          <dd className="tnum font-display mt-1 text-[22px] leading-none">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
