import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Uses the service role key, so it must never be
 * imported into a client component — RLS is enabled with no public policies
 * and every query in this app runs on the server.
 */
export function db() {
  // Read at runtime. NEXT_PUBLIC_* is inlined at build time, which meant a
  // changed URL appeared to have no effect until the next build — the older
  // name is still honoured so existing deployments keep working.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — see .env.example",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type BoardRow = {
  id: string;
  slug: string;
  name: string;
  url: string;
  tagline: string;
  logo_url: string | null;
  price_cents: number;
  tier_since: string;
  status: "active" | "past_due";
  created_at: string;
  category: string | null;
  rank: number;
  score: number;
  clicks_7d: number;
  clicks_30d: number;
  clicks_total: number;
};

export type Listing = {
  id: string;
  slug: string;
  name: string;
  url: string;
  domain: string;
  tagline: string;
  logo_url: string | null;
  email: string;
  price_cents: number;
  tier_since: string;
  status: "pending" | "active" | "past_due" | "grace" | "canceled";
  grace_until: string | null;
  cancel_scheduled: boolean;
  manage_token: string;
  polar_subscription_id: string | null;
  polar_customer_id: string | null;
  polar_product_id: string | null;
  created_at: string;
};
