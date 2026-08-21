import Link from "next/link";
import { SubmitForm, type PreviewRow } from "@/components/SubmitForm";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { BOARD_SIZE, FLOOR_CENTS, formatPrice, tierToBeat } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ cents?: string }>;
}) {
  const { cents } = await searchParams;

  // The current board, so the price picker can show what rank each tier
  // would actually buy and who it would pass — not just a list of numbers.
  let rows: PreviewRow[] = [];
  try {
    const { data } = await db()
      .from("board")
      .select("rank, name, price_cents")
      .order("rank", { ascending: true })
      .limit(BOARD_SIZE)
      .returns<PreviewRow[]>();
    rows = data ?? [];
  } catch (err) {
    console.error("board lookup failed", err);
  }

  const cut = rows.find((r) => r.rank === BOARD_SIZE) ?? null;
  const minCents = cut ? (tierToBeat(cut.price_cents)?.cents ?? FLOOR_CENTS) : FLOOR_CENTS;
  const requested = Number(cents);
  const defaultCents = Number.isFinite(requested) && requested >= minCents ? requested : minCents;

  return (
    <main className="stage relative mx-auto w-full max-w-5xl px-4 pt-14 pb-24 sm:px-6">
      <Link href="/" className="relative z-10 text-sm text-muted transition hover:text-fg">
        ← back to the house
      </Link>

      <header className="relative z-10 mt-6 mb-10">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Take a seat</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          {cut
            ? `The board is full — ${formatPrice(minCents)}/mo or more gets you on, and pushes #${BOARD_SIZE} off.`
            : `Pick your price, see your rank. Your ${SITE.noun} goes live the moment payment clears.`}
        </p>
      </header>

      <SubmitForm rows={rows} minCents={minCents} defaultCents={defaultCents} />
    </main>
  );
}
