/**
 * The seating plan — one source of truth for how many seats exist, what each
 * row costs, and which seat a listing actually occupies.
 *
 * Seats are earned, not bought. Every listing pays the same flat monthly fee
 * for a place; the board orders by clicks delivered per active day, so the
 * front row goes to whatever people actually want to click.
 *
 * Ranking is computed in SQL (see the `board` view) and this file only says
 * how the room is shaped — how many seats per row and how they are drawn.
 */

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
};

export const ROWS: Row[] = [
  { label: "Royal box", seats: 1, heightPx: 0, curvePx: 0, widthCss: "" },
  { label: "Front row", seats: 2, heightPx: 0, curvePx: 0, widthCss: "" },
  { label: "A", seats: 6, heightPx: 125, curvePx: 6, widthCss: "calc(10.667vw - 16.0px)" },
  { label: "B", seats: 8, heightPx: 116, curvePx: 8, widthCss: "calc(9.75vw - 13.0px)" },
  { label: "C", seats: 10, heightPx: 108, curvePx: 10, widthCss: "calc(9.0vw - 11.2px)" },
  { label: "D", seats: 11, heightPx: 102, curvePx: 12, widthCss: "calc(8.545vw - 10.55px)" },
  { label: "E", seats: 12, heightPx: 98, curvePx: 14, widthCss: "calc(8.167vw - 10.0px)" },
];

export const BOARD_SIZE = ROWS.reduce((n, r) => n + r.seats, 0);

/**
 * Seats one account may hold in a day.
 *
 * Two rather than one, so somebody with two products can list both — but a
 * hard cap, so nobody quietly fills the house. Duplicates are prevented
 * separately, by the one-listing-per-domain rule, which means the two seats
 * must be two different products.
 */
export const SEATS_PER_ACCOUNT = 2;

/** Seat number of the first seat in a row (1-based). */
export function rowOffset(index: number): number {
  return ROWS.slice(0, index).reduce((n, r) => n + r.seats, 0) + 1;
}


export type Placeable = { id: string; rank: number };

/**
 * Seat number per listing. The database already ordered them by earned rank,
 * so this is a direct mapping — kept as a function so every surface goes
 * through one place and the board, dashboard and previews cannot disagree.
 */
export function placeListings(listings: Placeable[]): Map<string, number> {
  const seats = new Map<string, number>();
  for (const l of listings) {
    if (l.rank >= 1 && l.rank <= BOARD_SIZE) seats.set(l.id, l.rank);
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
