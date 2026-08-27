import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which configuration the running deployment can actually see.
 *
 * Names and presence only -- never a value, not even a masked one. Gated
 * behind the admin key because knowing which variables exist is a small
 * amount of help to someone probing the site, and it costs nothing to
 * withhold it.
 *
 * This exists because "I added the environment variables" and "the running
 * build can see them" are different claims, and from the outside they look
 * identical: both produce a 503.
 */
const EXPECTED = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "CLICK_SALT",
  "CRON_SECRET",
  "ADMIN_KEY",
  "DODO_API_KEY",
  "DODO_SERVER",
  "DODO_WEBHOOK_SECRET",
];

export async function GET(request: Request) {
  const key = process.env.ADMIN_KEY;
  const given = new URL(request.url).searchParams.get("key");
  if (!key || given !== key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const present: Record<string, boolean> = {};
  for (const name of EXPECTED) present[name] = !!process.env[name];

  // Anything DODO_-prefixed the build can see, in case the name is subtly
  // wrong -- a trailing space or a lowercase letter looks identical in a
  // dashboard and is invisible from outside.
  const dodoNames = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes("DODO"))
    .sort();

  return NextResponse.json(
    { present, dodoNames, node: process.version },
    { headers: { "cache-control": "no-store" } },
  );
}
