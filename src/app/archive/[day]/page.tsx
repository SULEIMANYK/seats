import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { recordVisit } from "@/lib/visits";

export const dynamic = "force-dynamic";

type Row = {
  rank: number;
  listing_id: string;
  name: string;
  url: string;
  slug: string;
  category: string | null;
  clicks_24h: number;
};

function fmt(day: string) {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  return {
    title: `${day} — ${SITE.domain}`,
    description: `The board on ${day}.`,
  };
}

export default async function ArchiveDayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;

  // The day is a path segment and goes into a query, so it must look like a
  // date before it gets anywhere near the database.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) notFound();

  recordVisit(`/archive/${day}`, await headers());

  let rows: Row[] = [];
  try {
    const { data } = await db()
      .from("daily_ranks")
      .select("rank, listing_id, name, url, slug, category, clicks_24h")
      .eq("day", day)
      .order("rank", { ascending: true })
      .returns<Row[]>();
    rows = data ?? [];
  } catch (err) {
    console.error("archive day unavailable", err);
  }

  if (rows.length === 0) notFound();

  const totalClicks = rows.reduce((n, r) => n + r.clicks_24h, 0);

  return (
    <main className="stage relative mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/archive" className="relative z-10 text-sm text-muted hover:text-fg">
        ← all days
      </Link>

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{fmt(day)}</h1>
        <p className="tnum mt-2 text-[13px] text-muted">
          {rows.length} {rows.length === 1 ? "seat" : "seats"} ·{" "}
          {totalClicks.toLocaleString()} clicks
        </p>
      </header>

      <ol className="relative z-10 space-y-1.5">
        {rows.map((r) => {
          const featured = r.rank <= 3;
          return (
            <li key={r.listing_id}>
              <a
                href={`/r/${r.slug}`}
                target="_blank"
                rel="noopener"
                className={`flex items-center gap-3 rounded-2xl border p-3 card-shadow transition-all duration-200 hover:-translate-y-0.5 ${
                  featured ? "border-gold-line bg-gold-soft" : "border-edge bg-panel"
                }`}
              >
                <span
                  className={`tnum w-7 shrink-0 text-center text-[13px] font-semibold ${
                    featured ? "text-gold" : "text-muted"
                  }`}
                >
                  {r.rank}
                </span>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/icon?domain=${encodeURIComponent(displayDomain(r.url))}`}
                  alt=""
                  className="size-8 shrink-0 rounded-lg bg-bg object-contain p-1 ring-1 ring-edge"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[14px] font-semibold">{r.name}</span>
                    {r.category && (
                      <span className="hidden shrink-0 rounded-full bg-faint px-2 py-0.5 text-[10px] text-muted sm:inline">
                        {r.category}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {displayDomain(r.url)}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="tnum block text-[13px] font-semibold">{r.clicks_24h}</span>
                  <span className="block text-[10px] text-muted">clicks</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      <p className="relative z-10 mt-12 text-[11px] text-muted/60">{SITE.domain}</p>
    </main>
  );
}
