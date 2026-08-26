import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidCategory } from "@/lib/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One screenful. Small enough to feel instant, large enough to fill a page. */
export const PAGE_SIZE = 24;

/**
 * A page of the Browse list.
 *
 * Offset paging rather than a keyset cursor. The ordering key is seat_day,
 * which is a date shared by everything listed on the same day, so it cannot
 * identify a position on its own -- a cursor would need a tiebreaker and
 * still skip rows whenever a day's worth of products sorted equal. Browse is
 * a few thousand rows at most and is not a hot path, so the simpler thing is
 * the right thing here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const categoryParam = url.searchParams.get("category");
  const category = isValidCategory(categoryParam) ? categoryParam : null;

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = db()
    .from("browse_products")
    .select(
      "id, slug, name, url, domain, tagline, logo_url, image_url, category, pricing_model, seat_day, created_at, days_on_board, clicks_total, is_featured",
      { count: "exact" },
    )
    // Paid placement sorts first, then the usual most-recent-first.
    .order("is_featured", { ascending: false })
    .order("seat_day", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (category) query = query.eq("category", category);
  if (q) {
    // Escape the PostgREST or() separators before interpolating, so a comma
    // or paren in a search box cannot rewrite the filter expression.
    const safe = q.replace(/[,()\\]/g, " ");
    query = query.or(`name.ilike.%${safe}%,tagline.ilike.%${safe}%,domain.ilike.%${safe}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("browse page failed", error);
    return NextResponse.json({ error: "Could not load listings" }, { status: 500 });
  }

  const rows = data ?? [];

  return NextResponse.json(
    {
      rows,
      page,
      total: count ?? 0,
      hasMore: from + rows.length < (count ?? 0),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
