/** Bids are whole dollars in the UI, cents everywhere else. */
export const MIN_INCREMENT_CENTS = 100;

/**
 * The floor for a listing nobody has bid on.
 *
 * Set to the increment itself, so the only rule anywhere is "more than the
 * one you are passing". A separate, higher floor meant a listing holding a
 * rank at $1 could not be taken for $2 -- the board showed one number and
 * the bid box demanded another.
 */
export const OPENING_BID_CENTS = MIN_INCREMENT_CENTS;

export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return dollars >= 1000
    ? `$${Math.round(dollars).toLocaleString()}`
    : `$${dollars.toLocaleString(undefined, { minimumFractionDigits: dollars % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/**
 * What it costs to take a given rank.
 *
 * Strictly more than the listing currently holding it -- equal is not enough,
 * because ties are broken by who bid first and the incumbent always did.
 */
export function priceToBeat(currentCents: number): number {
  return Math.max(OPENING_BID_CENTS, currentCents + MIN_INCREMENT_CENTS);
}
