/** Product names are what the customer reads at checkout — they still said
 *  "Front Row" after the rename to seats.lol. */
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "production",
});

const ids = JSON.parse(process.env.POLAR_PRODUCT_IDS);
for (const [cents, id] of Object.entries(ids)) {
  const dollars = Number(cents) / 100;
  const name = `Seat on seats.lol — $${dollars.toLocaleString("en-US")}/mo`;
  await polar.products.update({
    id,
    productUpdate: {
      name,
      description: `One of 100 seats on seats.lol at $${dollars.toLocaleString("en-US")}/month. What you pay decides your rank — raise it any time to move forward.`,
    },
  });
  console.log("renamed:", name);
}
