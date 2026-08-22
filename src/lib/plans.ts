/**
 * The three plans.
 *
 * Rank is earned by clicks in every one of them. What a subscription buys is
 * instruments — attribution, benchmarking, a badge — not position. That is
 * both the honest description and the one payment processors accept.
 */

export type PlanId = "listed" | "pro" | "growth";

export type Plan = {
  id: PlanId;
  name: string;
  cents: number;
  tagline: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "listed",
    name: "Listed",
    cents: 1900,
    tagline: "A seat on the board.",
    features: [
      "Seat on the board, ranked by clicks",
      "Click tracking and public stats",
      "Logo, tagline and link",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    cents: 4900,
    tagline: "See what the traffic is worth.",
    features: [
      "Everything in Listed",
      "UTM tagging — clicks appear in your own analytics",
      "Category benchmarking against your rivals",
      "A/B test two taglines, winner picked on click-through",
      "Weekly report by email",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    cents: 14900,
    tagline: "Take the board with you.",
    features: [
      "Everything in Pro",
      "Embeddable rank badge for your own site",
      "Dofollow link",
      "Up to three links — site, docs, pricing",
      "API access to your stats",
    ],
  },
];

export const PLAN_BY_ID: Record<PlanId, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.id, p]),
) as Record<PlanId, Plan>;

export function isValidPlan(v: unknown): v is PlanId {
  return typeof v === "string" && PLANS.some((p) => p.id === v);
}

export function planForCents(cents: number): PlanId {
  return PLANS.find((p) => p.cents === cents)?.id ?? "listed";
}

/** Plan ordering, for "does this plan include that feature" checks. */
const RANK: Record<PlanId, number> = { listed: 0, pro: 1, growth: 2 };

export function atLeast(plan: PlanId, required: PlanId): boolean {
  return RANK[plan] >= RANK[required];
}
