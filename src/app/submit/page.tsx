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
      .select("id, name, price_cents, tier_since")
      .order("rank", { ascending: true })
      .limit(BOARD_SIZE)
      .returns<PreviewRow[]>();
    rows = data ?? [];
  } catch (err) {
    console.error("board lookup failed", err);
  }

  // A full house means the cheapest seat is gone, so the entry price is one
  // rung above whatever is holding the last seat.
  const full = rows.length >= BOARD_SIZE;
  const cheapest = rows.reduce<number | null>(
    (lowest, r) => (lowest === null || r.price_cents < lowest ? r.price_cents : lowest),
    null,
  );
  const minCents =
    full && cheapest !== null ? (tierToBeat(cheapest)?.cents ?? FLOOR_CENTS) : FLOOR_CENTS;
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
          {full
            ? `The house is full — ${formatPrice(minCents)}/mo or more gets you in, and the last seat loses its place.`
            : `Every row has a price. Pick one and see exactly where you'll sit — your ${SITE.noun} goes up the moment payment clears.`}
        </p>
      </header>

      <SubmitForm rows={rows} minCents={minCents} defaultCents={defaultCents} />
    </main>
  );
}
