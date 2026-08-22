import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { atLeast, type PlanId } from "@/lib/plans";

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
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!,
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
  <rect width="${lw + rw}" height="24" rx="5" fill="#14141a"/>
  <rect x="${lw}" width="${rw}" height="24" rx="5" fill="${accent}"/>
  <rect x="${lw}" width="6" height="24" fill="${accent}"/>
  <g font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="11">
    <text x="${lw / 2}" y="16" fill="#f7f7f5" text-anchor="middle">${esc(left)}</text>
    <text x="${lw + rw / 2}" y="16" fill="#14141a" text-anchor="middle" font-weight="600">${esc(right)}</text>
  </g>
</svg>`;
}

function svg(body: string, maxAge: number) {
  return new NextResponse(body, {
    headers: {
      "content-type": "image/svg+xml",
      // Short cache: rank changes daily, and a stale badge is a wrong claim.
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
    const { data: row } = await supabase
      .from("board")
      .select("id, rank, category, plan, clicks_7d")
      .eq("slug", slug)
      .maybeSingle<{
        id: string;
        rank: number;
        category: string | null;
        plan: PlanId;
        clicks_7d: number;
      }>();

    if (!row) return svg(badge("seats.lol", "not listed", "#d2d2cb"), 300);

    // The badge is a Growth feature. Lower plans get an honest badge rather
    // than an error image, so an embed never breaks someone's page.
    if (!atLeast(row.plan, "growth")) {
      return svg(badge("seats.lol", "listed", "#e8c877"), 300);
    }

    let label = `#${row.rank}`;
    if (row.category) {
      const { data: bench } = await supabase
        .from("category_benchmark")
        .select("category_rank")
        .eq("id", row.id)
        .maybeSingle<{ category_rank: number }>();
      if (bench) label = `#${bench.category_rank} in ${row.category}`;
    }

    return svg(badge("seats.lol", label, "#e8c877"), 900);
  } catch (err) {
    console.error("badge failed", err);
    return svg(badge("seats.lol", "—", "#d2d2cb"), 60);
  }
}
