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
  topCents,
  listings,
}: {
  visitors: number;
  hoursSinceLaunch: number;
  revenueCents: number;
  topCents: number;
  listings: number;
}) {
  // Until money has actually changed hands, "bid so far" reads as $0 next to
  // a board showing prices, which looks broken rather than honest. Show what
  // the top rank costs instead -- true, useful, and impossible to misread as
  // revenue. Once there is revenue, it takes the slot.
  const money: [string, string] =
    revenueCents > 0
      ? [formatMoney(revenueCents), "bid so far"]
      : [formatMoney(topCents), "to take #1"];

  const items: [string, string][] = [
    [visitors.toLocaleString(), "visitors"],
    [hoursSinceLaunch.toLocaleString(), hoursSinceLaunch === 1 ? "hour live" : "hours live"],
    money,
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
