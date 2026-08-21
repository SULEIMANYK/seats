import Link from "next/link";
import { Auditorium } from "@/components/Auditorium";
import { SITE } from "@/lib/config";
import { db, type BoardRow as Row } from "@/lib/db";
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
    <main className="stage relative flex w-full flex-col md:h-dvh md:overflow-hidden">
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
              {rows.length}/{BOARD_SIZE} seats
            </span>
            {open > 0 && <span className="tnum text-[#f7f7f5]/45">· {open} free</span>}
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

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-3 pb-4 sm:px-6">
        <Auditorium rows={rows} floorCents={entry ?? FLOOR_CENTS} />
      </div>
    </main>
  );
}
