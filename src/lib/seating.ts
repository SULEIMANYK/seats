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
  { label: "A", seats: 12, heightPx: 62, curvePx: 5, widthCss: "calc(6.5vw - 10.0px)" },
  { label: "B", seats: 14, heightPx: 59, curvePx: 6, widthCss: "calc(5.857vw - 9.14px)" },
  { label: "C", seats: 16, heightPx: 56, curvePx: 7, widthCss: "calc(5.375vw - 8.5px)" },
  { label: "D", seats: 18, heightPx: 53, curvePx: 8, widthCss: "calc(4.944vw - 8.0px)" },
  { label: "E", seats: 20, heightPx: 50, curvePx: 9, widthCss: "calc(4.6vw - 7.6px)" },
  { label: "F", seats: 22, heightPx: 47, curvePx: 10, widthCss: "calc(4.318vw - 7.27px)" },
  { label: "G", seats: 23, heightPx: 45, curvePx: 11, widthCss: "calc(4.217vw - 7.13px)" },
  { label: "H", seats: 24, heightPx: 43, curvePx: 12, widthCss: "calc(4.083vw - 7.0px)" },
  { label: "J", seats: 24, heightPx: 41, curvePx: 13, widthCss: "calc(4.083vw - 7.0px)" },
  { label: "K", seats: 24, heightPx: 39, curvePx: 14, widthCss: "calc(4.083vw - 7.0px)" },
];

export const BOARD_SIZE = ROWS.reduce((n, r) => n + r.seats, 0);

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
