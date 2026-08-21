import { Polar } from "@polar-sh/sdk";

let client: Polar | null = null;

export function polar(): Polar {
  if (client) return client;

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error("POLAR_ACCESS_TOKEN is not set");

  client = new Polar({
    accessToken,
    // Point at Polar's sandbox while testing; unset for production.
    server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
  });
  return client;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}
