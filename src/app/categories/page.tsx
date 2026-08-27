import Link from "next/link";
import { db } from "@/lib/db";
import { SITE } from "@/lib/config";
import { CATEGORIES } from "@/lib/categories";
import { formatMoney, priceToBeat } from "@/lib/bidding";
import { displayDomain } from "@/lib/slug";
import { Favicon } from "@/components/Favicon";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Categories — ${SITE.domain}`,
  description: "Every category on the board, and what it costs to top each one.",
};

type Row = {
  id: string;
  slug: string;
  name: string;
  url: string;
  logo_url: string | null;
  category: string | null;
  bid_cents: number;
  rank: number;
  clicks_total: number;
};

export default async function CategoriesPage() {
  let rows: Row[] = [];
  try {
    const { data } = await db()
      .from("leaderboard")
      .select("id, slug, name, url, logo_url, category, bid_cents, rank, clicks_total")
      .order("rank")
      .limit(500)
      .returns<Row[]>();
    rows = data ?? [];
  } catch (err) {
    console.error("categories unavailable", err);
  }

  // Leaderboard comes back rank-ordered, so the first row seen for a category
  // is by definition the one topping it.
  const top = new Map<string, Row>();
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.category) continue;
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    if (!top.has(r.category)) top.set(r.category, r);
  }

  // Occupied categories first, most contested at the top; the rest listed
  // after, because an empty category is the cheapest thing on the board and
  // that is worth showing rather than hiding.
  const held = CATEGORIES.filter((c) => top.has(c)).sort(
    (a, b) => (top.get(b)!.bid_cents ?? 0) - (top.get(a)!.bid_cents ?? 0),
  );
  const open = CATEGORIES.filter((c) => !top.has(c));

  return (
    <main className="stage relative mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <h1 className="relative z-10 mt-6 text-4xl sm:text-5xl">Categories</h1>
      <p className="relative z-10 mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
        Who tops each one, and what it costs to take it off them.
      </p>

      {held.length > 0 && (
        <ol className="relative z-10 mt-8 space-y-2">
          {held.map((c) => {
            const r = top.get(c)!;
            return (
              <li
                key={c}
                className="flex items-center gap-3 rounded-2xl border border-edge bg-panel p-4 card-shadow"
              >
                <Favicon
                  logoUrl={r.logo_url}
                  domain={displayDomain(r.url)}
                  className="size-9 shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{c}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">
                    {r.name} holds it &middot; {counts.get(c)}{" "}
                    {counts.get(c) === 1 ? "listing" : "listings"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block text-[14px] font-semibold">
                    {formatMoney(r.bid_cents)}
                  </span>
                  <span className="tnum block text-[10px] text-muted">
                    take for {formatMoney(priceToBeat(r.bid_cents))}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <h2 className="relative z-10 mt-10 mb-3 text-[15px]">Nobody holds these yet</h2>
      <div className="relative z-10 flex flex-wrap gap-2">
        {open.map((c) => (
          <span
            key={c}
            className="rounded-full border border-edge bg-panel px-3 py-1.5 text-[12px] text-muted"
          >
            {c}
          </span>
        ))}
      </div>
      <p className="relative z-10 mt-3 text-[12px] text-muted/70">
        An unheld category goes to the first bid of any size.
      </p>

      <p className="relative z-10 mt-10">
        <Link
          href="/submit"
          className="pill inline-block bg-gold px-6 py-3 text-[14px] font-semibold text-[#141413]"
        >
          Get listed
        </Link>
      </p>
    </main>
  );
}
