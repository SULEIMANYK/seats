import Link from "next/link";
import { headers } from "next/headers";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { getStats, recordVisit } from "@/lib/visits";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Stats — ${SITE.domain}`,
  description: "Traffic, clicks and trending listings on seats.lol.",
};

type Trending = {
  id: string;
  slug: string;
  name: string;
  url: string;
  tagline: string;
  logo_url: string | null;
  category: string | null;
  price_cents: number;
  clicks_this_week: number;
  clicks_prev_week: number;
  is_new: boolean;
  change_pct: number | null;
};

type CategoryStat = {
  category: string;
  seats: number;
  mrr_cents: number;
  clicks_30d: number;
};

async function getPageData() {
  try {
    const supabase = db();
    const [{ data: trending }, { data: categories }] = await Promise.all([
      supabase.from("trending").select("*").limit(10).returns<Trending[]>(),
      supabase.from("category_stats").select("*").returns<CategoryStat[]>(),
    ]);
    return { trending: trending ?? [], categories: categories ?? [] };
  } catch (err) {
    console.error("stats page data unavailable", err);
    return { trending: [], categories: [] };
  }
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-panel p-5 card-shadow">
      <p className="text-[11px] tracking-wide text-muted uppercase">{label}</p>
      <p className="tnum mt-1.5 text-3xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="tnum mt-1 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

export default async function StatsPage() {
  recordVisit("/stats", await headers());
  const [stats, { trending, categories }] = await Promise.all([getStats(), getPageData()]);


  return (
    <main className="stage relative mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-10">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Stats</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          Everything the board knows about itself, in public. If a seat
          isn&apos;t worth what it costs, these numbers will say so.
        </p>
      </header>

      <section className="relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Visitors today"
          value={(stats?.visitors_24h ?? 0).toLocaleString()}
          sub={`${(stats?.visits_24h ?? 0).toLocaleString()} page views`}
        />
        <Stat
          label="Clicks today"
          value={(stats?.clicks_24h ?? 0).toLocaleString()}
          sub={`${(stats?.clicks_total ?? 0).toLocaleString()} all time`}
        />
        <Stat
          label="Seats taken"
          value={(stats?.seats_taken ?? 0).toLocaleString()}
        />
      </section>

      <section className="relative z-10 mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Trending</h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Clicks today against yesterday.
        </p>

        {trending.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-edge-strong/60 p-8 text-center text-[13px] text-muted">
            Nothing on the board yet.{" "}
            <Link href="/submit" className="text-accent hover:underline">
              Take the first seat →
            </Link>
          </p>
        ) : (
          <ol className="mt-5 space-y-2">
            {trending.map((row, i) => (
              <li key={row.id}>
                <a
                  href={`/r/${row.slug}`}
                  target="_blank"
                  rel="noopener nofollow"
                  className="group flex items-center gap-3 rounded-2xl border border-edge bg-panel p-3.5 card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:card-shadow-lift"
                >
                  <span className="tnum w-5 text-right text-[11px] text-muted">{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.logo_url ?? `/api/icon?domain=${encodeURIComponent(displayDomain(row.url))}`}
                    alt=""
                    className="size-9 shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[14px] font-semibold">{row.name}</span>
                      {row.category && (
                        <span className="hidden shrink-0 rounded-full bg-faint px-2 py-0.5 text-[10px] text-muted sm:inline">
                          {row.category}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[12px] text-muted">
                      {row.tagline}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tnum block text-[14px] font-semibold">
                      {row.clicks_this_week.toLocaleString()}
                    </span>
                    <span className="tnum block text-[10px] text-muted">
                      {row.is_new
                        ? "new"
                        : row.change_pct === null
                          ? "—"
                          : `${row.change_pct > 0 ? "+" : ""}${row.change_pct}%`}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </section>

      {categories.length > 0 && (
        <section className="relative z-10 mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Categories</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-3 card-shadow"
              >
                <span className="truncate text-[13px] font-medium">{c.category}</span>
                <span className="tnum shrink-0 text-[11px] text-muted">
                  {c.seats} {c.seats === 1 ? "seat" : "seats"} ·{" "}
                  {c.clicks_30d.toLocaleString()} clicks
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="relative z-10 mt-14 text-[11px] text-muted/60">{SITE.domain}</p>
    </main>
  );
}
