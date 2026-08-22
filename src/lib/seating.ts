/**
 * The seating plan — one source of truth for how many seats exist, what each
 * row costs, and which seat a listing actually occupies.
 *
 * Why placement is bracket-based rather than a plain price ordering:
 * the chart advertises a price per row, so a $7 listing must not land in the
 * royal box just because nothing else is on the board yet. A listing sits in
 * the best row whose asking price it has actually met. That makes every price
 * printed on the chart true.
 *
 * Within a row, the earliest to reach that price sits nearer the middle —
 * the same tie-break the database uses, so nobody loses a seat by refreshing.
 */

export type Row = {
  /** Display label. The first two rows are boxes, not lettered. */
  label: string;
  seats: number;
  /** Minimum monthly price, in cents, to sit in this row. */
  askingCents: number;
  /** Rendered seat size in px. Boxes ignore this. */
  sizePx: number;
  /** How far the middle of the row bows away from the stage, in px. */
  curvePx: number;
};

export const ROWS: Row[] = [
  { label: "Royal box", seats: 1, askingCents: 39900, sizePx: 0, curvePx: 0 },
  { label: "Front row", seats: 2, askingCents: 21900, sizePx: 0, curvePx: 0 },
  { label: "A", seats: 12, askingCents: 9900, sizePx: 58, curvePx: 5 },
  { label: "B", seats: 14, askingCents: 7900, sizePx: 55, curvePx: 6 },
  { label: "C", seats: 16, askingCents: 5900, sizePx: 52, curvePx: 7 },
  { label: "D", seats: 18, askingCents: 4900, sizePx: 49, curvePx: 8 },
  { label: "E", seats: 20, askingCents: 3900, sizePx: 46, curvePx: 9 },
  { label: "F", seats: 22, askingCents: 2900, sizePx: 44, curvePx: 10 },
  { label: "G", seats: 23, askingCents: 1900, sizePx: 42, curvePx: 11 },
  { label: "H", seats: 24, askingCents: 1200, sizePx: 40, curvePx: 12 },
  { label: "J", seats: 24, askingCents: 900, sizePx: 38, curvePx: 13 },
  { label: "K", seats: 24, askingCents: 700, sizePx: 36, curvePx: 14 },
];

export const BOARD_SIZE = ROWS.reduce((n, r) => n + r.seats, 0);

/** Seat number of the first seat in a row (1-based). */
export function rowOffset(index: number): number {
  return ROWS.slice(0, index).reduce((n, r) => n + r.seats, 0) + 1;
}

/** The best row a given monthly price qualifies for. */
export function rowForCents(cents: number): number {
  for (let i = 0; i < ROWS.length; i++) {
    if (cents >= ROWS[i].askingCents) return i;
  }
  return ROWS.length - 1;
}

export type Placeable = { id: string; price_cents: number; tier_since: string };

/**
 * Assigns every listing a seat number.
 *
 * A row that fills up spills into the row behind it, so paying a row's price
 * guarantees you that row *or better* — never worse than advertised, and the
 * board can never claim a seat is occupied twice.
 */
export function placeListings(listings: Placeable[]): Map<string, number> {
  const byRow: Placeable[][] = ROWS.map(() => []);

  for (const listing of listings) {
    byRow[rowForCents(listing.price_cents)].push(listing);
  }

  const seats = new Map<string, number>();

  for (let i = 0; i < ROWS.length; i++) {
    // Earliest at this price sits first; a stable id keeps equal rows from
    // swapping seats between requests.
    byRow[i].sort(
      (a, b) => a.tier_since.localeCompare(b.tier_since) || a.id.localeCompare(b.id),
    );

    const capacity = ROWS[i].seats;
    const seated = byRow[i].splice(0, capacity);
    seated.forEach((l, n) => seats.set(l.id, rowOffset(i) + n));

    // Overflow drops to the next row back.
    if (byRow[i].length && i + 1 < ROWS.length) byRow[i + 1].push(...byRow[i]);
  }

  return seats;
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
