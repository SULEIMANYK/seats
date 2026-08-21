/**
 * Creates one Polar product per price tier and prints the POLAR_PRODUCT_IDS
 * env var to paste into .env.local.
 *
 *   POLAR_ACCESS_TOKEN=... POLAR_SERVER=sandbox node scripts/setup-products.mjs
 *
 * Safe to re-run: products whose name already exists are reused, not duplicated.
 */
import { Polar } from "@polar-sh/sdk";

const TIERS = [2900, 3900, 4900, 6900, 9900, 14900, 19900, 29900, 49900, 99900];

const accessToken = process.env.POLAR_ACCESS_TOKEN;
if (!accessToken) {
  console.error("POLAR_ACCESS_TOKEN is required");
  process.exit(1);
}

const polar = new Polar({
  accessToken,
  server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
});

const nameFor = (cents) => `Front Row — $${cents / 100}/mo`;

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
    description: `A slot on frontrow.lol at $${cents / 100}/month. Your price sets your rank.`,
    recurringInterval: "month",
    prices: [{ amountType: "fixed", priceAmount: cents, priceCurrency: "usd" }],
  });

  map[cents] = product.id;
  console.log(`✓ created ${name}`);
}

console.log("\nAdd this to .env.local:\n");
console.log(`POLAR_PRODUCT_IDS='${JSON.stringify(map)}'`);
