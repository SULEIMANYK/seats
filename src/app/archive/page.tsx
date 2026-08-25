import Link from "next/link";
import { headers } from "next/headers";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { recordVisit } from "@/lib/visits";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Archive — ${SITE.domain}`,
  description: "Every day's board, and who held the front row.",
};

type Day = {
  day: string;
  listings: number;
  clicks: number;
  winner_name: string | null;
  winner_slug: string | null;
  winner_url: string | null;
  winner_clicks: number | null;
};

function fmt(day: string) {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function ArchivePage() {
  recordVisit("/archive", await headers());

  let days: Day[] = [];
  try {
    const { data } = await db().from("archive_days").select("*").limit(120).returns<Day[]>();
    days = data ?? [];
  } catch (err) {
    console.error("archive unavailable", err);
  }

  return (
    <main className="stage relative mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-10">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Archive</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          The board is won again every day. This is who held the front row, and
          what the room looked like behind them.
        </p>
      </header>

      {days.length === 0 ? (
        <p className="relative z-10 rounded-2xl border border-dashed border-edge-strong/60 p-10 text-center text-[13px] text-muted">
          No days recorded yet. The first snapshot is taken tonight.
        </p>
      ) : (
        <ol className="relative z-10 space-y-2">
          {days.map((d) => (
            <li key={d.day}>
              <Link
                href={`/archive/${d.day}`}
                className="flex items-center gap-4 rounded-2xl border border-edge bg-panel p-4 card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:card-shadow-lift"
              >
                <span className="w-32 shrink-0 text-[12px] text-muted">{fmt(d.day)}</span>

                <span className="min-w-0 flex-1">
                  {d.winner_name ? (
                    <>
                      <span className="block truncate text-[14px] font-semibold">
                        {d.winner_name}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {d.winner_url ? displayDomain(d.winner_url) : ""} · held the front row
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] text-muted">The royal box sat empty</span>
                  )}
                </span>

                <span className="shrink-0 text-right">
                  <span className="tnum block text-[13px] font-semibold">
                    {(d.winner_clicks ?? 0).toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-muted">clicks</span>
                </span>

                <span className="tnum hidden w-20 shrink-0 text-right text-[11px] text-muted sm:block">
                  {d.listings} {d.listings === 1 ? "seat" : "seats"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <p className="relative z-10 mt-12 text-[11px] text-muted/60">{SITE.domain}</p>
    </main>
  );
}
