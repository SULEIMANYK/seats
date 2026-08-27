import Link from "next/link";
import { headers } from "next/headers";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { recordVisit } from "@/lib/visits";
import { BrowseList, type BrowseRow } from "@/components/BrowseList";
import { PAGE_SIZE } from "@/app/api/browse/route";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Browse — ${SITE.domain}`,
  description: "Every product that has ever held a seat, not just today's board.",
};

/**
 * The first page is rendered on the server so the list is in the HTML: it is
 * the page most likely to arrive from a search engine, and an empty shell
 * that fills in on scroll indexes as an empty shell. Every page after this
 * one is fetched by the client as it scrolls.
 */
async function firstPage() {
  try {
    const { data, error, count } = await db()
      .from("browse_products")
      .select(
        "id, slug, name, url, domain, tagline, logo_url, image_url, category, pricing_model, seat_day, created_at, days_on_board, clicks_total, is_featured",
        { count: "exact" },
      )
      .order("is_featured", { ascending: false })
      .order("seat_day", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .returns<BrowseRow[]>();

    if (error) {
      console.error("browse first page failed", error);
      return { rows: [], total: 0, hasMore: false };
    }
    const rows = data ?? [];
    return { rows, total: count ?? rows.length, hasMore: rows.length < (count ?? 0) };
  } catch (err) {
    console.error("browse unavailable", err);
    return { rows: [], total: 0, hasMore: false };
  }
}

export default async function BrowsePage() {
  recordVisit("/browse", await headers());
  const initial = await firstPage();

  return (
    <main className="stage relative mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Browse</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          Every {SITE.noun} that has ever held a seat, not just today&apos;s board — most
          recently seen first.
        </p>
      </header>

      <div className="relative z-10">
        <BrowseList initial={initial} />
      </div>

      <p className="relative z-10 mt-12 text-[11px] text-muted/60">{SITE.domain}</p>
    </main>
  );
}
