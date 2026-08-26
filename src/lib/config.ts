/** Everything niche-specific lives here — swap these to retarget the board. */
export const SITE = {
  name: "seats",
  domain: "seats.lol",
  /** What the board lists. Appears throughout the copy. */
  noun: "product",
  nounPlural: "products",
  tagline: "Just outbid your competition to get to the top.",
  description:
    "A leaderboard you climb with money. Every rank has a price — bid higher than the listing above you and you take its place. No algorithm, just the money, in public.",
} as const;
