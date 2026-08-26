import { NextResponse } from "next/server";
import { authoriseListing } from "@/lib/listing-auth";
import { BOARD_SIZE } from "@/lib/seating";

export const runtime = "nodejs";

/**
 * Move a listing to a different free seat.
 *
 * Only within today's board: seats are cleared at midnight UTC, so a row
 * from an earlier day has no seat to move and moving it would put yesterday
 * back on today's chart.
 *
 * A taken seat is refused rather than swapped into. Two people trading
 * places sounds neighbourly but means one of them is moved without asking.
 */
export async function POST(request: Request) {
  let body: { token?: string; listingId?: string; seat?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listing, supabase } = await authoriseListing(body.token);
  if (!listing) {
    return NextResponse.json({ error: "Not yours, or no longer there." }, { status: 404 });
  }

  const wanted = Number(body.seat);
  if (!Number.isInteger(wanted) || wanted < 1 || wanted > BOARD_SIZE) {
    return NextResponse.json(
      { error: `Pick a seat between 1 and ${BOARD_SIZE}.` },
      { status: 400 },
    );
  }

  if (listing.status !== "active" && listing.status !== "past_due") {
    return NextResponse.json(
      { error: "That listing is not on the board." },
      { status: 409 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  if (listing.seat_day !== today) {
    return NextResponse.json(
      { error: "That seat was for an earlier day. Claim a seat for today instead." },
      { status: 409 },
    );
  }

  // Asking for the seat you already have is a no-op, not an error — the
  // chart is clickable and people click where they already are.
  if (listing.seat === wanted) {
    return NextResponse.json({ ok: true, seat: wanted, moved: false });
  }

  const { data: held } = await supabase
    .from("listings")
    .select("id")
    .eq("seat", wanted)
    .eq("seat_day", today)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (held) {
    return NextResponse.json(
      { error: `Seat ${wanted} is taken. Pick another.`, seatTaken: wanted },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("listings")
    .update({ seat: wanted, updated_at: new Date().toISOString() })
    .eq("id", listing.id);

  if (error) {
    // 23505 is the unique index on (seat, seat_day): somebody took it in the
    // moment between the check above and this update.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Seat ${wanted} was taken a moment ago. Pick another.`, seatTaken: wanted },
        { status: 409 },
      );
    }
    console.error("seat move failed", error);
    return NextResponse.json({ error: "Could not move your seat" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, seat: wanted, moved: true });
}
