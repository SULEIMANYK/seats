import Link from "next/link";
import { BoardGrid } from "@/components/BoardGrid";
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
    // Missing config shouldn't 500 the homepage — show the empty board instead.
    console.error("board unavailable", err);
    return [];
  }
}

export default async function Home() {
  const rows = await getBoard();
  const taken = rows.length;
  const open = BOARD_SIZE - taken;

  // On a full board the entry price is whatever clears #100.
  const cut = rows[BOARD_SIZE - 1]?.price_cents;
  const entry = cut ? (tierToBeat(cut)?.cents ?? null) : FLOOR_CENTS;

  return (
    <main className="stage relative mx-auto w-full max-w-[1500px] px-4 pt-16 pb-24 sm:px-6">
      <header className="relative z-10 mb-12 flex flex-col items-center text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1 text-[11px] text-muted backdrop-blur">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-gold" />
          </span>
          <span className="tnum">
            {taken} of {BOARD_SIZE} slots taken
          </span>
          {open > 0 && <span className="tnum text-muted/60">· {open} open</span>}
        </span>

        <h1 className="text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">
          front<span className="text-muted/50">row</span>
        </h1>

        <p className="mt-4 max-w-lg text-balance text-[15px] leading-relaxed text-muted">
          {SITE.description}
        </p>

        <Link
          href={entry ? `/submit?cents=${entry}` : "/submit"}
          className="mt-7 rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg shadow-[0_10px_30px_-12px_rgba(255,255,255,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-12px_rgba(255,255,255,0.6)]"
        >
          {open > 0
            ? `Claim a slot — from ${formatPrice(entry ?? FLOOR_CENTS)}/mo`
            : `Board is full — outbid #${BOARD_SIZE}`}
        </Link>
      </header>

      <BoardGrid rows={rows} floorCents={entry ?? FLOOR_CENTS} />

      <section className="relative z-10 mx-auto mt-20 grid max-w-4xl gap-8 border-t border-edge pt-12 text-sm text-muted sm:grid-cols-3">
        <div>
          <h2 className="mb-2 font-semibold tracking-tight text-fg">Your price is your rank</h2>
          <p>
            Pick a monthly price. Pay more than the {SITE.noun} above you and you take its
            spot. Same price? Whoever got there first stays ahead.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold tracking-tight text-fg">Climb any time</h2>
          <p>
            Raise your price from your manage link and you move within seconds. You&apos;re only
            charged the difference for the rest of the month.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold tracking-tight text-fg">Only 100 slots</h2>
          <p>
            When the board is full, getting on means clearing #{BOARD_SIZE}. Whoever it
            displaces gets 7 days to come back before the slot is gone.
          </p>
        </div>
      </section>

      <footer className="relative z-10 mt-16 text-center text-xs text-muted/60">
        {SITE.domain}
      </footer>
    </main>
  );
}
