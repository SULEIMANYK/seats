import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Outbound click tracker. Every listing links through here so we can show each
 * one what it actually got for its money — the number that decides whether
 * they renew next month.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = db();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, url, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!listing || listing.status === "canceled") {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";

  // Hashed with a server-side salt so the raw IP is never stored.
  const ipHash = createHash("sha256")
    .update(ip + (process.env.CLICK_SALT ?? "seats.lol"))
    .digest("hex")
    .slice(0, 32);

  // Fire and forget — a slow insert should never delay the redirect.
  void supabase
    .from("clicks")
    .insert({
      listing_id: listing.id,
      ip_hash: ipHash,
      referer: request.headers.get("referer")?.slice(0, 500) ?? null,
      ua: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("click insert failed", error);
    });

  return NextResponse.redirect(listing.url, 302);
}
