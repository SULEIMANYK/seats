import Link from "next/link";
import { Auditorium } from "@/components/Auditorium";
import { BoardList } from "@/components/BoardList";
import { ResetTimer } from "@/components/ResetTimer";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE } from "@/lib/config";
import { db, type BoardRow as Row } from "@/lib/db";
import { BOARD_SIZE } from "@/lib/seating";
import { getStats, recordVisit } from "@/lib/visits";
import { headers } from "next/headers";

// The board changes whenever someone pays, so never serve it stale.
export const dynamic = "force-dynamic";

async function getBoard(): Promise<Row[]> {
  try {
    const { data, error } = await db()
      .from("board")
      .select("*")
      .limit(BOARD_SIZE)
      .returns<Row[]>();

    if (error) {
      console.error("board query failed", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    // Missing config shouldn't 500 the homepage — show the empty house instead.
    console.error("board unavailable", err);
    return [];
  }
}

export default async function Home() {
  // Counted before anything renders, so a slow board query cannot lose the
  // visit. recordVisit is fire-and-forget and never blocks.
  recordVisit("/", await headers());

  const [rows, stats] = await Promise.all([getBoard(), getStats()]);
  const open = BOARD_SIZE - rows.length;


  return (
    // One viewport, no scrolling: the whole house should be legible at a glance.
    // Phones fall back to scrolling — 100 seats in a phone viewport would be
    // unreadable.
    <main className="stage relative flex w-full flex-col">
      {/* The header is the stage. Everything else is the audience looking at it. */}
      <header className="boards relative z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-b-[2rem] px-6 py-4 text-[#f9f4da] sm:px-10">
        <div className="flex items-baseline gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.045em]">
            <Logo className="size-7 text-[#f9f4da]" />
            seats<span className="text-[#f9f4da]/40">.lol</span>
          </h1>
          <p className="hidden text-[13px] text-[#f9f4da]/55 sm:block">{SITE.tagline}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f9f4da]/20 bg-[#f9f4da]/10 px-3 py-1.5 text-[11px] text-[#f9f4da]/75">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold-line opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-gold-line" />
            </span>
            <span className="tnum">
              {rows.length === 0
                ? `${BOARD_SIZE} seats open`
                : `${rows.length}/${BOARD_SIZE} taken`}
            </span>
            {stats && stats.visitors_24h > 0 && (
              <span className="tnum text-[#f9f4da]/45">
                · {stats.visitors_24h.toLocaleString()} visitors today
              </span>
            )}
            {stats && stats.clicks_24h > 0 && (
              <span className="tnum text-[#f9f4da]/45">
                · {stats.clicks_24h.toLocaleString()} clicks
              </span>
            )}
            {rows.length === 0 && !stats?.visitors_24h && (
              <span className="text-[#f9f4da]/45">· be the first</span>
            )}
            <span className="text-[#f9f4da]/25">·</span>
            <ResetTimer />
          </span>

          <ThemeToggle />

          <Link
            href="/dashboard"
            className="hidden text-[12px] text-[#f9f4da]/55 transition hover:text-[#f9f4da] sm:block"
          >
            your seat
          </Link>

          <Link
            href="/archive"
            className="hidden text-[12px] text-[#f9f4da]/55 transition hover:text-[#f9f4da] sm:block"
          >
            archive
          </Link>

          <Link
            href="/browse"
            className="hidden text-[12px] text-[#f9f4da]/55 transition hover:text-[#f9f4da] sm:block"
          >
            browse
          </Link>

          <Link
            href="/stats"
            className="hidden text-[12px] text-[#f9f4da]/55 transition hover:text-[#f9f4da] sm:block"
          >
            stats →
          </Link>

          <Link
            href="/submit"
            className="pill bg-gold px-5 py-2 text-[13px] font-semibold text-[#141413]"
          >
            {open > 0 ? "Take a seat — free" : "House full"}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-col px-3 pt-3 pb-4 sm:px-6 xl:h-[calc(100dvh-4.5rem)]">
        {/* The chart needs about 1200px before its widest row fits; below
            that the same board is a ranked list. */}
        <div className="hidden xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <Auditorium rows={rows} />
        </div>
        <div className="xl:hidden">
          <BoardList rows={rows} />
        </div>
      </div>

      {/* Below the fold. The chart owns the first screen; anyone who scrolls
          wants to know the rules before they spend money. */}
      <section className="relative z-10 border-t border-edge bg-bg-lift/60 px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>

          <div className="mt-6 grid gap-8 text-[13px] leading-relaxed text-muted sm:grid-cols-3">
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">Free, with no catch</h3>
              <p>
                No fee, no plan, no card, no upsell. A seat costs nothing — the only thing
                it asks is that you turn up before the fifty are gone.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">First come, first served</h3>
              <p>
                Seats go in the order people claim them, and yours stays yours all day.
                Nobody can outbid you or click their way past.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">Only {BOARD_SIZE} seats</h3>
              <p>
                Fifty a day. When they are gone they are gone until tomorrow, and yesterday
                is kept in the archive.
              </p>
            </div>
          </div>

          <h2 className="mt-12 text-xl font-semibold tracking-tight">The rules</h2>
          <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-muted">
            <li>
              <span className="text-fg">One seat per domain.</span> Two listings for the same
              site can&apos;t occupy two seats.
            </li>
            <li>
              <span className="text-fg">Two seats per account, one per site.</span> Nobody
              can quietly fill the house, and the same product cannot appear twice.
            </li>
            <li>
              <span className="text-fg">Position cannot be bought or won.</span> There is no
              payment, no bidding and no ranking. Clicks are counted and shown, but they do
              not move anyone.
            </li>
            <li>
              <span className="text-fg">Leave whenever you like.</span> Remove your listing
              from the manage page and the seat frees up straight away for someone else.
            </li>
            <li>
              <span className="text-fg">Every click is counted, in public.</span> You can see
              exactly what the seat sent you, and so can everyone else.
            </li>
          </ul>

          <p className="mt-10 text-[11px] text-muted/60">{SITE.domain}</p>
        </div>
      </section>
    </main>
  );
}
