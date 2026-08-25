/** How a product is sold. Shown on the listing so people know before clicking. */
export const PRICING_MODELS = [
  "Free",
  "Freemium",
  "Paid",
  "Open source",
  "Free trial",
] as const;

export type PricingModel = (typeof PRICING_MODELS)[number];

export function isValidPricingModel(v: unknown): v is PricingModel {
  return typeof v === "string" && (PRICING_MODELS as readonly string[]).includes(v);
}
