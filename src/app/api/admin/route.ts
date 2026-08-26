import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Takes a reported listing off the board.
 *
 * The admin page is not what makes this safe — it's re-derived here from
 * scratch. Anyone who isn't signed in as ADMIN_EMAIL (or when it isn't set
 * at all) gets a bare 404, matching what a request to a route that doesn't
 * exist looks like. A 403 would confirm there's something here worth
 * probing; a 404 doesn't.
 *
 * Marked rather than deleted, same as an owner removing their own listing —
 * see the DELETE handler in /api/listing. The archive already copied the
 * name and url at snapshot time, so history is unaffected.
 */
export async function POST(request: Request) {
  // A shared secret rather than an account, because there are no accounts.
  // Unset means the route does not work at all -- an admin surface that opens
  // itself when a variable is missing is worse than one that is unreachable.
  const key = process.env.ADMIN_KEY;
  const given =
    new URL(request.url).searchParams.get("key") ??
    request.headers.get("x-admin-key");

  if (!key || given !== key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let listingId: string | undefined;

  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      listingId = typeof body.listingId === "string" ? body.listingId : undefined;
    } else {
      const form = await request.formData();
      const value = form.get("listingId");
      listingId = typeof value === "string" ? value : undefined;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!listingId) {
    return NextResponse.json({ error: "Missing listing" }, { status: 400 });
  }

  const supabase = db();
  const { error } = await supabase
    .from("listings")
    .update({ status: "canceled", seat: null, updated_at: new Date().toISOString() })
    .eq("id", listingId);

  if (error) {
    console.error("admin takedown failed", error);
    return NextResponse.json({ error: "Could not remove the listing" }, { status: 500 });
  }

  // The admin page's takedown button is a plain <form> post — no client JS
  // required to moderate from a phone. Send it back to the list. A JSON
  // caller (curl, a script) gets JSON back instead.
  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }

  return NextResponse.json({ ok: true });
}
