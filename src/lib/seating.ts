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
  /** Rendered seat size in px. Boxes ignore this. */
  sizePx: number;
  /** How far the middle of the row bows away from the stage, in px. */
  curvePx: number;
};

export const ROWS: Row[] = [
  { label: "Royal box", seats: 1, sizePx: 0, curvePx: 0 },
  { label: "Front row", seats: 2, sizePx: 0, curvePx: 0 },
  { label: "A", seats: 12, sizePx: 58, curvePx: 5 },
  { label: "B", seats: 14, sizePx: 55, curvePx: 6 },
  { label: "C", seats: 16, sizePx: 52, curvePx: 7 },
  { label: "D", seats: 18, sizePx: 49, curvePx: 8 },
  { label: "E", seats: 20, sizePx: 46, curvePx: 9 },
  { label: "F", seats: 22, sizePx: 44, curvePx: 10 },
  { label: "G", seats: 23, sizePx: 42, curvePx: 11 },
  { label: "H", seats: 24, sizePx: 40, curvePx: 12 },
  { label: "J", seats: 24, sizePx: 38, curvePx: 13 },
  { label: "K", seats: 24, sizePx: 36, curvePx: 14 },
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
