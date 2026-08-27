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

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-2xl sm:text-3xl">Get listed</h1>
        <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-muted">
          Adding your listing is free. Where it sits is not &mdash; the board is ordered by what
          each listing has paid, so you place a bid once you are on it.
        </p>
      </header>

      <SubmitForm full={full} seat={seat} taken={taken} initialUrl={urlParam ?? ""} />
    </main>
  );
}
