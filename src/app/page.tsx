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
    // The board is meant to be taken in at a glance, so on desktop the page is
    // exactly one viewport and never scrolls. Phones fall back to scrolling —
    // 100 slots in a phone viewport would be unreadable.
    <main className="stage relative mx-auto flex w-full max-w-[1600px] flex-col px-4 py-4 md:h-dvh md:overflow-hidden">
      <header className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.045em]">
            front<span className="text-muted/50">row</span>
          </h1>
          <p className="hidden text-[13px] text-muted sm:block">{SITE.tagline}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1.5 text-[11px] text-muted card-shadow">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-gold" />
            </span>
            <span className="tnum">
              {taken}/{BOARD_SIZE} taken
            </span>
            {open > 0 && <span className="tnum text-muted/60">· {open} open</span>}
          </span>

          <Link
            href={entry ? `/submit?cents=${entry}` : "/submit"}
            className="rounded-xl bg-fg px-4 py-2 text-[13px] font-semibold text-bg-lift card-shadow transition hover:-translate-y-0.5 hover:card-shadow-lift"
          >
            {open > 0
              ? `Claim a slot — from ${formatPrice(entry ?? FLOOR_CENTS)}`
              : `Outbid #${BOARD_SIZE}`}
          </Link>
        </div>
      </header>

      <BoardGrid rows={rows} floorCents={entry ?? FLOOR_CENTS} />
    </main>
  );
}
