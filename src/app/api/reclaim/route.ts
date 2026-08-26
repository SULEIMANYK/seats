import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BOARD_SIZE } from "@/lib/seating";
import { hashIp, tooManyRecently } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Take a seat again today using a previous listing's details.
 *
 * A nightly clear is only survivable if returning is one click. Retyping the
 * form every morning is what would actually kill the board, not the reset.
 *
 * Authorised by the previous listing's manage token, which is the only
 * credential this site issues. Holding it is proof you created that listing,
 * which is exactly the claim being made here.
 */
export async function POST(request: Request) {
  let body: { token?: string; seat?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = db();
  const today = new Date().toISOString().slice(0, 10);

  if (await tooManyRecently(supabase, "listings", "submit_ip_hash", hashIp(request), 6, 3_600_000)) {
    return NextResponse.json(
      { error: "That's a lot of claims in a short time. Try again later." },
      { status: 429 },
    );
  }

  // The manage token is the authorisation. An id on its own is not.
  const { data: prev } = await supabase
    .from("listings")
    .select("*")
    .eq("manage_token", body.token ?? "")
    .maybeSingle();

  if (!prev) {
    return NextResponse.json({ error: "That listing isn't yours." }, { status: 404 });
  }

  // Already back on today's board -- hand back the row that is already there
  // rather than refusing, since the button that calls this is idempotent from
  // the visitor's point of view.
  const { data: already } = await supabase
    .from("listings")
    .select("manage_token, seat")
    .eq("domain", prev.domain)
    .eq("seat_day", today)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (already) {
    return NextResponse.json({ manageToken: already.manage_token, seat: already.seat });
  }

  const wanted = Number(body.seat);
  const picked =
    Number.isInteger(wanted) && wanted >= 1 && wanted <= BOARD_SIZE ? wanted : null;

  const { data: taken } = await supabase
    .from("listings")
    .select("seat")
    .eq("seat_day", today)
    .in("status", ["active", "past_due"])
    .not("seat", "is", null)
    .returns<{ seat: number }[]>();

  const used = new Set((taken ?? []).map((t) => t.seat));

  let seat: number | null = picked !== null && !used.has(picked) ? picked : null;
  if (seat === null) {
    for (let n = 1; n <= BOARD_SIZE; n++) {
      if (!used.has(n)) { seat = n; break; }
    }
  }
  if (seat === null) {
    return NextResponse.json({ error: "Every seat is taken today." }, { status: 409 });
  }

  // A new row per day, so each day's board stays a record of that day rather
  // than one row being rewritten and the archive losing its history.
  const { data: created, error } = await supabase
    .from("listings")
    .insert({
      slug: prev.slug,
      name: prev.name,
      url: prev.url,
      domain: prev.domain,
      tagline: prev.tagline,
      description: prev.description,
      pricing_model: prev.pricing_model,
      logo_url: prev.logo_url,
      image_url: prev.image_url,
      category: prev.category,
      extra_links: prev.extra_links,
      email: prev.email,
      seat,
      seat_day: today,
      submit_ip_hash: hashIp(request),
      status: "active",
      tier_since: new Date().toISOString(),
    })
    .select("manage_token")
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      // Could be the seat, or the domain/slug losing a race with another
      // tab. Only the seat is worth retrying, so only that one says so.
      const seatRace = (error.message ?? "").includes("seat");
      return NextResponse.json(
        {
          error: seatRace
            ? `Seat ${seat} went a moment ago. Try again.`
            : "That product already has a seat today.",
        },
        { status: 409 },
      );
    }
    console.error("reclaim failed", error);
    return NextResponse.json({ error: "Could not claim a seat" }, { status: 500 });
  }

  return NextResponse.json({ manageToken: created.manage_token, seat });
}
