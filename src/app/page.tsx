import Link from "next/link";
import { Auditorium } from "@/components/Auditorium";
import { SITE } from "@/lib/config";
import { db, type BoardRow as Row } from "@/lib/db";
import { ROWS } from "@/lib/seating";
import { BOARD_SIZE, FLOOR_CENTS, formatPrice, tierToBeat } from "@/lib/tiers";

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
  const rows = await getBoard();
  const open = BOARD_SIZE - rows.length;

  // On a full board the entry price is whatever clears the last seat.
  const cut = rows[BOARD_SIZE - 1]?.price_cents;
  const entry = cut ? (tierToBeat(cut)?.cents ?? null) : FLOOR_CENTS;

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
            {rows.length === 0 && (
              <span className="text-[#f7f7f5]/45">· be the first</span>
            )}
          </span>

          <Link
            href={entry ? `/submit?cents=${entry}` : "/submit"}
            className="rounded-xl bg-[#f7f7f5] px-4 py-2 text-[13px] font-semibold text-[#14141a] transition hover:-translate-y-0.5"
          >
            {open > 0
              ? `Take a seat — from ${formatPrice(entry ?? FLOOR_CENTS)}`
              : `Outbid seat #${BOARD_SIZE}`}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-col px-3 pt-3 pb-4 sm:px-6 md:h-[calc(100dvh-4.5rem)]">
        <Auditorium rows={rows} />
      </div>

      {/* Below the fold. The chart owns the first screen; anyone who scrolls
          wants to know the rules before they spend money. */}
      <section className="relative z-10 border-t border-edge bg-bg-lift/60 px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>

          <div className="mt-6 grid gap-8 text-[13px] leading-relaxed text-muted sm:grid-cols-3">
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">Every row has a price</h3>
              <p>
                {formatPrice(ROWS[0].askingCents)} for the royal box down to{" "}
                {formatPrice(ROWS[ROWS.length - 1].askingCents)} for the back row. Pay a
                row&apos;s price and you sit in that row — never further back than advertised.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">Move forward any time</h3>
              <p>
                Raise your monthly price from your manage link and you change seats within
                seconds. You&apos;re only charged the difference for the rest of the month.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 font-semibold text-fg">Only {BOARD_SIZE} seats</h3>
              <p>
                When the house fills, getting in means beating the last seat. Whoever it
                displaces keeps their listing for 7 days to come back before the seat is gone.
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
              <span className="text-fg">Same price, earlier wins.</span> Matching the price of
              someone already seated puts you behind them, not ahead.
            </li>
            <li>
              <span className="text-fg">Prices go up mid-cycle, down at renewal.</span>
              Otherwise you could drop to the floor right after a traffic spike and climb back
              before the next one.
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
