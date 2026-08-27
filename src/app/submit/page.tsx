import Link from "next/link";
import { SubmitForm } from "@/components/SubmitForm";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { BOARD_SIZE } from "@/lib/seating";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ seat?: string; url?: string }>;
}) {
  const { seat: seatParam, url: urlParam } = await searchParams;
  const wanted = Number(seatParam);
  const seat = Number.isInteger(wanted) && wanted >= 1 && wanted <= BOARD_SIZE ? wanted : null;

  // The current board, so the price picker can show what rank each tier
  // would actually buy and who it would pass — not just a list of numbers.
  let rows: { id: string; rank: number }[] = [];
  try {
    const { data } = await db()
      .from("board")
      .select("id, rank")
      .order("rank", { ascending: true })
      .limit(BOARD_SIZE)
      .returns<{ id: string; rank: number }[]>();
    rows = data ?? [];
  } catch (err) {
    console.error("board lookup failed", err);
  }

  const full = rows.length >= BOARD_SIZE;
  // Seats already spoken for, so the picker can open with the right ones
  // greyed out. It re-checks on a timer once it is on screen.
  const taken = rows.map((r) => r.rank).filter((n) => n >= 1 && n <= BOARD_SIZE);

  return (
    <main className="stage relative mx-auto w-full max-w-5xl px-4 pt-14 pb-24 sm:px-6">
      <Link href="/" className="relative z-10 text-sm text-muted transition hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-10">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Take a seat</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          {full
            ? "Every seat is taken right now. Seats free up when listings go quiet — check back."
            : `Free. Add your ${SITE.noun} and the next seat is yours — nobody can take it from you.`}
        </p>
      </header>

      <SubmitForm full={full} seat={seat} taken={taken} initialUrl={urlParam ?? ""} />
    </main>
  );
}
