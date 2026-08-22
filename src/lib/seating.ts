/**
 * The seating plan — one source of truth for how many seats exist, what each
 * row costs, and which seat a listing actually occupies.
 *
 * One ladder. A row's price sets both where you sit and what you get: the
 * front of the house costs more and carries the better tools, the back is
 * cheap and plain.
 *
 * Placement is bracket-based, not a plain price ordering — a $7 listing must
 * not land in the royal box merely because nothing else is on the board yet.
 * A listing sits in the best row whose asking price it has actually met,
 * which is what makes every price printed on the chart true.
 */

import type { PlanId } from "./plans";

export type Row = {
  /** Display label. The first two rows are boxes, not lettered. */
  label: string;
  seats: number;
  /**
   * Seat height in px. Boxes ignore this.
   *
   * Height and width are separate because the two axes have very different
   * budgets: about 300px of unused width at a laptop size against roughly 60
   * of height. Seats therefore widen with the viewport but stay the same
   * depth — which is how a real seat is shaped anyway.
   */
  heightPx: number;
  /** How far the middle of the row bows away from the stage, in px. */
  curvePx: number;
  /** Seat width, as a viewport-relative calc so each row fills its share. */
  widthCss: string;
  /** Monthly price, in cents, to sit in this row. */
  askingCents: number;
  /** Features that come with this row. */
  plan: PlanId;
};

export const ROWS: Row[] = [
  { label: "Royal box", seats: 1, heightPx: 0, curvePx: 0, widthCss: "", askingCents: 39900, plan: "growth" },
  { label: "Front row", seats: 2, heightPx: 0, curvePx: 0, widthCss: "", askingCents: 21900, plan: "growth" },
  { label: "A", seats: 12, heightPx: 62, curvePx: 5, widthCss: "calc(6.5vw - 10.0px)", askingCents: 14900, plan: "growth" },
  { label: "B", seats: 14, heightPx: 59, curvePx: 6, widthCss: "calc(5.857vw - 9.14px)", askingCents: 9900, plan: "pro" },
  { label: "C", seats: 16, heightPx: 56, curvePx: 7, widthCss: "calc(5.375vw - 8.5px)", askingCents: 7900, plan: "pro" },
  { label: "D", seats: 18, heightPx: 53, curvePx: 8, widthCss: "calc(4.944vw - 8.0px)", askingCents: 5900, plan: "pro" },
  { label: "E", seats: 20, heightPx: 50, curvePx: 9, widthCss: "calc(4.6vw - 7.6px)", askingCents: 4900, plan: "pro" },
  { label: "F", seats: 22, heightPx: 47, curvePx: 10, widthCss: "calc(4.318vw - 7.27px)", askingCents: 3900, plan: "listed" },
  { label: "G", seats: 23, heightPx: 45, curvePx: 11, widthCss: "calc(4.217vw - 7.13px)", askingCents: 2900, plan: "listed" },
  { label: "H", seats: 24, heightPx: 43, curvePx: 12, widthCss: "calc(4.083vw - 7.0px)", askingCents: 1900, plan: "listed" },
  { label: "J", seats: 24, heightPx: 41, curvePx: 13, widthCss: "calc(4.083vw - 7.0px)", askingCents: 1200, plan: "listed" },
  { label: "K", seats: 24, heightPx: 39, curvePx: 14, widthCss: "calc(4.083vw - 7.0px)", askingCents: 700, plan: "listed" },
];

export const BOARD_SIZE = ROWS.reduce((n, r) => n + r.seats, 0);

/** Seat number of the first seat in a row (1-based). */
export function rowOffset(index: number): number {
  return ROWS.slice(0, index).reduce((n, r) => n + r.seats, 0) + 1;
}


export type Placeable = { id: string; price_cents: number; tier_since: string };

/** The best row a given monthly price qualifies for. */
export function rowForCents(cents: number): number {
  for (let i = 0; i < ROWS.length; i++) if (cents >= ROWS[i].askingCents) return i;
  return ROWS.length - 1;
}

/**
 * Assigns every listing a seat.
 *
 * A row that fills up spills into the row behind it, so paying a row's price
 * guarantees that row or better — never worse than advertised.
 */
export function placeListings(listings: Placeable[]): Map<string, number> {
  const byRow: Placeable[][] = ROWS.map(() => []);
  for (const l of listings) byRow[rowForCents(l.price_cents)].push(l);

  const seats = new Map<string, number>();
  for (let i = 0; i < ROWS.length; i++) {
    byRow[i].sort((a, b) => a.tier_since.localeCompare(b.tier_since) || a.id.localeCompare(b.id));
    byRow[i].splice(0, ROWS[i].seats).forEach((l, n) => seats.set(l.id, rowOffset(i) + n));
    if (byRow[i].length && i + 1 < ROWS.length) byRow[i + 1].push(...byRow[i]);
  }
  return seats;
}

/** The seat a listing would take if it paid `cents` now. */
export function seatIfPaying(cents: number, existing: Placeable[], selfId?: string): number {
  const others = selfId ? existing.filter((l) => l.id !== selfId) : existing;
  const probe: Placeable = { id: "__probe__", price_cents: cents, tier_since: new Date(8.64e15).toISOString() };
  return placeListings([...others, probe]).get("__probe__") ?? BOARD_SIZE;
}

/** Which row a seat number falls in. */
export function rowForSeat(seat: number): number {
  let n = 0;
  for (let i = 0; i < ROWS.length; i++) {
    n += ROWS[i].seats;
    if (seat <= n) return i;
  }
  return ROWS.length - 1;
}
