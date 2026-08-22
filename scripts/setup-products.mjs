/**
 * Creates one Polar product per price tier and prints the POLAR_PRODUCT_IDS
 * env var to paste into .env.local.
 *
 *   POLAR_ACCESS_TOKEN=... POLAR_SERVER=sandbox node scripts/setup-products.mjs
 *
 * Safe to re-run: products whose name already exists are reused, not duplicated.
 */
import { Polar } from "@polar-sh/sdk";

// Keep in step with TIERS in src/lib/tiers.ts.
const TIERS = [
  700, 900, 1200, 1500, 1900, 2900, 3900, 4900, 5900, 7900, 9900, 12900,
  16900, 21900, 29900, 39900, 54900, 74900, 99900, 149900, 249900,
];

const accessToken = process.env.POLAR_ACCESS_TOKEN;
if (!accessToken) {
  console.error("POLAR_ACCESS_TOKEN is required");
  process.exit(1);
}

const polar = new Polar({
  accessToken,
  server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
});

const nameFor = (cents) => `Seat on seats.lol — $${(cents / 100).toLocaleString("en-US")}/mo`;

// Pull the existing catalogue first so re-runs are idempotent.
const existing = new Map();
for await (const page of await polar.products.list({ limit: 100 })) {
  for (const product of page.result.items) existing.set(product.name, product.id);
}

const map = {};
for (const cents of TIERS) {
  const name = nameFor(cents);

  if (existing.has(name)) {
    map[cents] = existing.get(name);
    console.log(`· reused  ${name}`);
    continue;
  }

  const product = await polar.products.create({
    name,
    description: `One of 100 seats on seats.lol at $${(cents / 100).toLocaleString("en-US")}/month. What you pay decides your rank — raise it any time to move forward.`,
    recurringInterval: "month",
    prices: [{ amountType: "fixed", priceAmount: cents, priceCurrency: "usd" }],
  });

  map[cents] = product.id;
  console.log(`✓ created ${name}`);
}

console.log("\nAdd this to .env.local:\n");
console.log(`POLAR_PRODUCT_IDS='${JSON.stringify(map)}'`);
