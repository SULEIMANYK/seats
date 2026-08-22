import Link from "next/link";
import { SubmitForm } from "@/components/SubmitForm";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { BOARD_SIZE, SEAT_CENTS, formatPrice } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {

  // The current board, so the price picker can show what rank each tier
  // would actually buy and who it would pass — not just a list of numbers.
  let rows: { id: string }[] = [];
  try {
    const { data } = await db()
      .from("board")
      .select("id")
      .order("rank", { ascending: true })
      .limit(BOARD_SIZE)
      .returns<{ id: string }[]>();
    rows = data ?? [];
  } catch (err) {
    console.error("board lookup failed", err);
  }

  const full = rows.length >= BOARD_SIZE;

  return (
    <main className="stage relative mx-auto w-full max-w-5xl px-4 pt-14 pb-24 sm:px-6">
      <Link href="/" className="relative z-10 text-sm text-muted transition hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-10">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Take a seat</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          {full
            ? "Every seat is taken right now. Seats free up when listings lapse — check back."
            : `${formatPrice(SEAT_CENTS)} a month for a place on the board. Where you sit is earned — the most clicked ${SITE.nounPlural} move to the front.`}
        </p>
      </header>

      <SubmitForm full={full} />
    </main>
  );
}
