import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * An embeddable rank badge, served as SVG.
 *
 * This is the growth loop: a Growth subscriber puts "Ranked #3 in Developer
 * Tools" on their own homepage, which is a trust signal for them and inbound
 * traffic for the board. Rendered server-side as an image so it works in a
 * plain <img> tag, README, or anywhere scripts are not allowed.
 */

function esc(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function badge(left: string, right: string, accent: string): string {
  // Rough advance width for the label font; exact metrics need font loading,
  // and being a pixel or two wide is invisible at this size.
  const w = (t: string) => Math.ceil(t.length * 6.2) + 16;
  const lw = w(left);
  const rw = w(right);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="24" role="img" aria-label="${esc(left)}: ${esc(right)}">
  <title>${esc(left)}: ${esc(right)}</title>
  <rect width="${lw + rw}" height="24" rx="5" fill="#141413"/>
  <rect x="${lw}" width="${rw}" height="24" rx="5" fill="${accent}"/>
  <rect x="${lw}" width="6" height="24" fill="${accent}"/>
  <g font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="11">
    <text x="${lw / 2}" y="16" fill="#f9f4da" text-anchor="middle">${esc(left)}</text>
    <text x="${lw + rw / 2}" y="16" fill="#141413" text-anchor="middle" font-weight="600">${esc(right)}</text>
  </g>
</svg>`;
}

function svg(body: string, maxAge: number) {
  return new NextResponse(body, {
    headers: {
      "content-type": "image/svg+xml",
      // Short cache: rank changes whenever somebody bids, and a stale badge is a
      // wrong claim on someone else's site.
      "cache-control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const supabase = db();
    // Reads the leaderboard, not the retired seats view. That view filtered
    // on seat_day = today, so once the board became an auction the badge
    // returned "not listed" for every listing on it -- including whoever
    // happened to be at #1.
    const { data: row } = await supabase
      .from("leaderboard")
      .select("id, rank, category")
      .eq("slug", slug)
      .maybeSingle<{ id: string; rank: number; category: string | null }>();

    if (!row)
      return svg(badge("seats.lol", "not listed", "rgba(20,20,19,0.10)"), 300);

    let label = `#${row.rank}`;
    if (row.category) {
      // Place within the category, derived from the same ordering the board
      // uses rather than a separate view that could disagree with it.
      const { data: peers } = await supabase
        .from("leaderboard")
        .select("id")
        .eq("category", row.category)
        .order("rank")
        .returns<{ id: string }[]>();

      const place = (peers ?? []).findIndex((x) => x.id === row.id);
      if (place >= 0) label = `#${place + 1} in ${row.category}`;
    }

    return svg(badge("seats.lol", label, "#fc7428"), 900);
  } catch (err) {
    console.error("badge failed", err);
    return svg(badge("seats.lol", "—", "rgba(20,20,19,0.10)"), 60);
  }
}
