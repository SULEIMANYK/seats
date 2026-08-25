import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BOARD_SIZE } from "@/lib/seating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which seats are taken right now.
 *
 * The submit form holds a seat in mind for as long as it takes to fill in a
 * name and a tagline, and somebody else can claim it in that window. This
 * lets the form notice while the person is still typing, rather than at the
 * moment they press the button.
 *
 * Public and read-only: seat occupancy is already on the front page.
 */
export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await db()
    .from("listings")
    .select("seat")
    .eq("seat_day", today)
    .in("status", ["active", "past_due"])
    .not("seat", "is", null)
    .returns<{ seat: number }[]>();

  if (error) {
    console.error("seat lookup failed", error);
    return NextResponse.json({ error: "Could not read the board" }, { status: 500 });
  }

  const taken = (data ?? []).map((r) => r.seat).sort((a, b) => a - b);

  return NextResponse.json(
    { taken, full: taken.length >= BOARD_SIZE, size: BOARD_SIZE },
    { headers: { "cache-control": "no-store" } },
  );
}
