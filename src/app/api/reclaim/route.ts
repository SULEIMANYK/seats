import { NextResponse } from "next/server";
import { currentEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { BOARD_SIZE, SEATS_PER_ACCOUNT } from "@/lib/seating";
import { hashIp, tooManyRecently } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Take a seat again today using a previous listing's details.
 *
 * A nightly clear is only survivable if returning is one click. Retyping the
 * form every morning is what would actually kill the board, not the reset.
 */
export async function POST(request: Request) {
  const owner = await currentEmail();
  if (!owner) {
    return NextResponse.json({ error: "Sign in first.", needsAuth: true }, { status: 401 });
  }

  let body: { listingId?: string; seat?: number };
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

  // Must be the caller's own listing — the id alone is not authorisation.
  const { data: prev } = await supabase
    .from("listings")
    .select("*")
    .eq("id", body.listingId ?? "")
    .eq("owner_email", owner)
    .maybeSingle();

  if (!prev) {
    return NextResponse.json({ error: "That listing isn't yours." }, { status: 404 });
  }

  const { count: held } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("owner_email", owner)
    .eq("seat_day", today)
    .in("status", ["active", "past_due"]);

  if ((held ?? 0) >= SEATS_PER_ACCOUNT) {
    return NextResponse.json(
      { error: `You already hold ${SEATS_PER_ACCOUNT} seats today.` },
      { status: 409 },
    );
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
      owner_email: owner,
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
      return NextResponse.json(
        { error: `Seat ${seat} went a moment ago. Try again.` },
        { status: 409 },
      );
    }
    console.error("reclaim failed", error);
    return NextResponse.json({ error: "Could not claim a seat" }, { status: 500 });
  }

  return NextResponse.json({ manageToken: created.manage_token, seat });
}
