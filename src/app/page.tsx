import Link from "next/link";
import { BoardRow } from "@/components/BoardRow";
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
    <main className="mx-auto w-full max-w-3xl px-4 pt-14 pb-24">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          front<span className="text-muted">row</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-muted">{SITE.description}</p>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <Link
            href={entry ? `/submit?cents=${entry}` : "/submit"}
            className="rounded-lg bg-fg px-4 py-2 font-medium text-bg transition hover:opacity-90"
          >
            {open > 0
              ? `Claim a slot — from ${formatPrice(entry ?? FLOOR_CENTS)}/mo`
              : `Board is full — beat #${BOARD_SIZE}`}
          </Link>
        </div>

        <p className="tnum mt-3 text-xs text-muted">
          {taken} of {BOARD_SIZE} slots taken
          {open > 0 ? ` · ${open} open` : " · full"}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge p-10 text-center">
          <p className="font-medium">The board is empty.</p>
          <p className="mt-1 text-sm text-muted">
            First {SITE.noun} on takes #1 for {formatPrice(FLOOR_CENTS)}/mo.
          </p>
        </div>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => (
            <BoardRow key={row.id} row={row} />
          ))}
        </ol>
      )}

      <section className="mt-14 grid gap-6 border-t border-edge pt-10 text-sm text-muted sm:grid-cols-3">
        <div>
          <h2 className="mb-1.5 font-medium text-fg">Your price is your rank</h2>
          <p>
            Pick a monthly price. Pay more than the {SITE.noun} above you and you take its
            spot. Same price? Whoever got there first stays ahead.
          </p>
        </div>
        <div>
          <h2 className="mb-1.5 font-medium text-fg">Climb any time</h2>
          <p>
            Raise your price from your manage link and you move within seconds. You&apos;re only
            charged the difference for the rest of the month.
          </p>
        </div>
        <div>
          <h2 className="mb-1.5 font-medium text-fg">Only 100 slots</h2>
          <p>
            When the board is full, getting on means clearing #{BOARD_SIZE}. Whoever it
            displaces gets 7 days to come back before the slot is gone.
          </p>
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-muted">
        <span>{SITE.domain}</span>
      </footer>
    </main>
  );
}
