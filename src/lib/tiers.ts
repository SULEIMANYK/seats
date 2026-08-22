/**
 * The price ladder.
 *
 * Polar can't change the amount of a pay-what-you-want subscription in place —
 * `subscriptions.update()` accepts `productId`, not `amount`. So instead of
 * free-form bids we run a fixed ladder of products, and climbing the board is
 * a prorated product swap, which Polar does natively and instantly.
 *
 * Each tier is one Polar product. Run `npm run setup:products` to create them.
 */

export type Tier = {
  cents: number;
  label: string;
};

/**
 * Sixteen rungs rather than ten, so the price falls away visibly from the
 * stage to the back wall instead of stepping in big jumps. Roughly 1.3x
 * between neighbours: close enough that climbing one rung feels affordable,
 * far enough apart that each rung buys a real move up the board.
 */
/** Entry price. Plans live in lib/plans; this is the cheapest of them. */
export const SEAT_CENTS = 700;

export const TIERS: Tier[] = [
  { cents: 700, label: "$7" },
  { cents: 1200, label: "$12" },
  { cents: 1900, label: "$19" },
  { cents: 2900, label: "$29" },
  { cents: 3900, label: "$39" },
  { cents: 4900, label: "$49" },
  { cents: 5900, label: "$59" },
  { cents: 7900, label: "$79" },
  { cents: 9900, label: "$99" },
  { cents: 14900, label: "$149" },
  { cents: 21900, label: "$219" },
  { cents: 39900, label: "$399" },
];

export const FLOOR_CENTS = SEAT_CENTS;
export { BOARD_SIZE } from "./seating";

/** Maps tier price -> Polar product id, from POLAR_PRODUCT_IDS. */
export function productIdForCents(cents: number): string {
  const raw = process.env.POLAR_PRODUCT_IDS;
  if (!raw) throw new Error("POLAR_PRODUCT_IDS is not set — run `npm run setup:products`");

  let map: Record<string, string>;
  try {
    map = JSON.parse(raw);
  } catch {
    throw new Error("POLAR_PRODUCT_IDS is not valid JSON");
  }

  const id = map[String(cents)];
  if (!id) throw new Error(`No Polar product configured for ${cents} cents`);
  return id;
}

export function isValidTier(cents: number): boolean {
  return TIERS.some((t) => t.cents === cents);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US")}`;
}


/** Reverse of productIdForCents — used by the webhook to sync price from Polar. */
export function centsForProductId(productId: string): number | null {
  const raw = process.env.POLAR_PRODUCT_IDS;
  if (!raw) return null;

  try {
    const map: Record<string, string> = JSON.parse(raw);
    for (const [cents, id] of Object.entries(map)) {
      if (id === productId) return Number(cents);
    }
  } catch {
    return null;
  }
  return null;
}
