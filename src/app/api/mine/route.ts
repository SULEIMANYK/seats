import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Resolve a browser's saved manage tokens into listings.
 *
 * Tokens are sent in the body rather than the query string so they stay out
 * of logs and out of the Referer header. Each one only ever returns its own
 * listing, so a caller learns nothing about tokens it does not already hold.
 */
export async function POST(request: Request) {
  let body: { tokens?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tokens = Array.isArray(body.tokens)
    ? body.tokens.filter((t): t is string => typeof t === "string").slice(0, 20)
    : [];

  if (tokens.length === 0) return NextResponse.json({ listings: [] });

  const { data, error } = await db()
    .from("listings")
    .select("manage_token, name, seat, seat_day, status")
    .in("manage_token", tokens)
    .returns<
      { manage_token: string; name: string; seat: number | null; seat_day: string; status: string }[]
    >();

  if (error) {
    console.error("mine lookup failed", error);
    return NextResponse.json({ error: "Could not read your seats" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);

  return NextResponse.json(
    {
      listings: (data ?? []).map((l) => ({
        token: l.manage_token,
        name: l.name,
        seat: l.seat,
        today: l.seat_day === today && (l.status === "active" || l.status === "past_due"),
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
