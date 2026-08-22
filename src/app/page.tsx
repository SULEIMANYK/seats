import Link from "next/link";
import { Auditorium } from "@/components/Auditorium";
import { BoardList } from "@/components/BoardList";
import { SITE } from "@/lib/config";
import { db, type BoardRow as Row } from "@/lib/db";
import { getStats, recordVisit } from "@/lib/visits";
import { headers } from "next/headers";
import { BOARD_SIZE, SEAT_CENTS, formatPrice } from "@/lib/tiers";

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
      <header className="boards relative z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-b-[2rem] px-6 py-4 text-[#f7f7f5] sm:px-10">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.045em]">
seats<span className="text-[#f7f7f5]/40">.lol</span>
          </h1>
          <p className="hidden text-[13px] text-[#f7f7f5]/55 sm:block">{SITE.tagline}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[11px] text-[#f7f7f5]/75">
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
              <span className="tnum text-[#f7f7f5]/45">
                · {stats.visitors_24h.toLocaleString()} visitors today
              </span>
            )}
            {stats && stats.clicks_24h > 0 && (
              <span className="tnum text-[#f7f7f5]/45">
                · {stats.clicks_24h.toLocaleString()} clicks
              </span>
            )}
            {rows.length === 0 && !stats?.visitors_24h && (
              <span className="text-[#f7f7f5]/45">· be the first</span>
            )}
          </span>

          <Link
            href="/stats"
            className="hidden text-[12px] text-[#f7f7f5]/55 transition hover:text-[#f7f7f5] sm:block"
          >
            stats →
          </Link>

          <Link
            href="/submit"
            className="rounded-xl bg-[#f7f7f5] px-4 py-2 text-[13px] font-semibold text-[#14141a] transition hover:-translate-y-0.5"
          >
            {open > 0 ? `Take a seat — from ${formatPrice(SEAT_CENTS)}/mo` : "House full"}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-col px-3 pt-3 pb-4 sm:px-6 xl:h-[calc(100dvh-4.5rem)]">
        {/* The chart needs ~1200px before its widest row fits. Below that the
            same board is a ranked list, which is what a phone is good at. */}
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
              <h3 className="mb-1.5 font-semibold text-fg">Pay for tools, not position</h3>
              <p>
                From {formatPrice(SEAT_CENTS)} a month. Plans buy tools — attribution,
                benchmarking, an embeddable badge — never position.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">Clicks move you forward</h3>
              <p>
                Seats are ordered by clicks per day over the last week. Earn more clicks
                than the listing in front of you and you take its seat — the board reorders
                itself continuously.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">Only {BOARD_SIZE} seats</h3>
              <p>
                When the house is full, nobody new gets in until a seat frees up. Listings
                that stop earning clicks drift backwards and eventually out.
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
              <span className="text-fg">New listings get a fair start.</span> Ranking uses
              clicks per active day, not lifetime totals, so a listing that joined yesterday
              can outrank one that joined last month.
            </li>
            <li>
              <span className="text-fg">Position cannot be bought.</span> There is no upgrade,
              no sponsored slot and no way to pay for a better seat. Clicks are the only
              currency.
            </li>
            <li>
              <span className="text-fg">Cancel any time.</span> You keep the seat until the
              period you&apos;ve paid for ends. No refunds for part-months.
            </li>
            <li>
              <span className="text-fg">Every click is counted and shown to you.</span> If the
              seat isn&apos;t worth what you pay, you&apos;ll be the first to know.
            </li>
          </ul>

          <p className="mt-10 text-[11px] text-muted/60">{SITE.domain}</p>
        </div>
      </section>
    </main>
  );
}
