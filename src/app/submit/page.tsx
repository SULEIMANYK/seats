import Link from "next/link";
import { SubmitForm } from "@/components/SubmitForm";
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

  // On a full board the floor is whatever clears #100.
  let cut: { price_cents: number } | null = null;
  try {
    const { data } = await db()
      .from("board")
      .select("price_cents")
      .eq("rank", BOARD_SIZE)
      .maybeSingle();
    cut = data;
  } catch (err) {
    console.error("cut lookup failed", err);
  }

  const minCents = cut ? (tierToBeat(cut.price_cents)?.cents ?? FLOOR_CENTS) : FLOOR_CENTS;
  const requested = Number(cents);
  const defaultCents = Number.isFinite(requested) && requested >= minCents ? requested : minCents;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-14 pb-24">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Claim a slot</h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        {cut
          ? `The board is full — ${formatPrice(minCents)}/mo or more gets you on, and pushes #${BOARD_SIZE} off.`
          : `Pick your price. Your ${SITE.noun} goes live the moment payment clears.`}
      </p>

      <SubmitForm minCents={minCents} defaultCents={defaultCents} />
    </main>
  );
}
