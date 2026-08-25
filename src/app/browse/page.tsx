import Link from "next/link";
import { headers } from "next/headers";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { recordVisit } from "@/lib/visits";
import { BrowseList } from "@/components/BrowseList";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Browse — ${SITE.domain}`,
  description: "Every product that has ever held a seat, not just today's board.",
};

/** One row per listing, as stored — a domain gets a new row for every day it holds a seat. */
type ListingRow = {
  id: string;
  slug: string;
  name: string;
  url: string;
  domain: string;
  tagline: string;
  description: string | null;
  logo_url: string | null;
  image_url: string | null;
  category: string | null;
  pricing_model: string | null;
  extra_links: { label: string; url: string }[];
  seat: number | null;
  seat_day: string | null;
  status: "active" | "past_due";
  created_at: string;
};

/** One row per domain — the browse screen's unit, after collapsing a product's history. */
export type BrowseRow = {
  id: string;
  slug: string;
  name: string;
  url: string;
  domain: string;
  tagline: string;
  description: string | null;
  logo_url: string | null;
  image_url: string | null;
  category: string | null;
  pricing_model: string | null;
  extra_links: { label: string; url: string }[];
  seat_day: string | null;
  created_at: string;
  daysOnBoard: number;
  clicksTotal: number;
};

const CLICK_CHUNK = 200;

async function getHistory(): Promise<BrowseRow[]> {
  try {
    // Every day a domain holds a seat it gets one more row (one-per-day is
    // enforced in the schema), most recent first — so the first row we see
    // for a domain is its latest appearance, and every row after that is one
    // more day on the board.
    const { data, error } = await db()
      .from("listings")
      .select(
        "id, slug, name, url, domain, tagline, description, logo_url, image_url, category, pricing_model, extra_links, seat, seat_day, status, created_at",
      )
      .in("status", ["active", "past_due"])
      .order("seat_day", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(5000)
      .returns<ListingRow[]>();

    if (error) {
      console.error("browse query failed", error);
      return [];
    }

    const rows = data ?? [];
    if (rows.length === 0) return [];

    const byDomain = new Map<string, { latest: ListingRow; ids: string[]; days: number }>();
    for (const row of rows) {
      const existing = byDomain.get(row.domain);
      if (existing) {
        existing.ids.push(row.id);
        existing.days += 1;
      } else {
        byDomain.set(row.domain, { latest: row, ids: [row.id], days: 1 });
      }
    }

    const entries = [...byDomain.values()];
    const allIds = entries.flatMap((e) => e.ids);

    // Clicks are per listing row, not per domain, so tally them across every
    // row a domain has ever had. Chunked so the `in()` filter never grows an
    // unbounded URL.
    const clicksByListing = new Map<string, number>();
    for (let i = 0; i < allIds.length; i += CLICK_CHUNK) {
      const chunk = allIds.slice(i, i + CLICK_CHUNK);
      const { data: clickRows, error: clickErr } = await db()
        .from("clicks")
        .select("listing_id")
        .in("listing_id", chunk);

      if (clickErr) {
        console.error("browse clicks query failed", clickErr);
        continue;
      }
      for (const c of clickRows ?? []) {
        clicksByListing.set(c.listing_id, (clicksByListing.get(c.listing_id) ?? 0) + 1);
      }
    }

    return entries
      .map(({ latest, ids, days }) => ({
        id: latest.id,
        slug: latest.slug,
        name: latest.name,
        url: latest.url,
        domain: latest.domain,
        tagline: latest.tagline,
        description: latest.description,
        logo_url: latest.logo_url,
        image_url: latest.image_url,
        category: latest.category,
        pricing_model: latest.pricing_model,
        extra_links: latest.extra_links,
        seat_day: latest.seat_day,
        created_at: latest.created_at,
        daysOnBoard: days,
        clicksTotal: ids.reduce((n, id) => n + (clicksByListing.get(id) ?? 0), 0),
      }))
      .sort((a, b) => {
        const ad = a.seat_day ?? a.created_at;
        const bd = b.seat_day ?? b.created_at;
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      });
  } catch (err) {
    console.error("browse unavailable", err);
    return [];
  }
}

export default async function BrowsePage() {
  recordVisit("/browse", await headers());

  const rows = await getHistory();

  return (
    <main className="stage relative mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-10">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Browse</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          Every {SITE.noun} that has ever held a seat, not just today&apos;s board — most
          recently seen first.
        </p>
      </header>

      <BrowseList rows={rows} />

      <p className="relative z-10 mt-12 text-[11px] text-muted/60">{SITE.domain}</p>
    </main>
  );
}
