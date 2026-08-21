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

export const TIERS: Tier[] = [
  { cents: 2900, label: "$29" },
  { cents: 3900, label: "$39" },
  { cents: 4900, label: "$49" },
  { cents: 6900, label: "$69" },
  { cents: 9900, label: "$99" },
  { cents: 14900, label: "$149" },
  { cents: 19900, label: "$199" },
  { cents: 29900, label: "$299" },
  { cents: 49900, label: "$499" },
  { cents: 99900, label: "$999" },
];

export const FLOOR_CENTS = TIERS[0].cents;
export const BOARD_SIZE = 100;

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

/**
 * The cheapest tier that would actually move you above `targetCents`.
 * Ties break toward whoever got there first, so matching the price above you
 * isn't enough — you have to clear it.
 */
export function tierToBeat(targetCents: number): Tier | null {
  return TIERS.find((t) => t.cents > targetCents) ?? null;
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
