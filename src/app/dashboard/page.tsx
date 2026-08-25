import Link from "next/link";
import { redirect } from "next/navigation";
import { currentEmail } from "@/lib/auth";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";
import { displayDomain } from "@/lib/slug";
import { ClaimAgain } from "@/components/ClaimAgain";

export const dynamic = "force-dynamic";
export const metadata = { title: `Your seat — ${SITE.domain}`, robots: { index: false } };

type Mine = {
  id: string;
  slug: string;
  name: string;
  url: string;
  seat: number | null;
  manage_token: string;
  status: string;
  seat_day: string;
};

export default async function DashboardPage() {
  const email = await currentEmail();
  if (!email) redirect("/signin?next=%2Fdashboard");

  const today = new Date().toISOString().slice(0, 10);

  let mine: Mine[] = [];
  try {
    const { data } = await db()
      .from("listings")
      .select("id, slug, name, url, seat, seat_day, manage_token, status")
      .eq("owner_email", email)
      .in("status", ["active", "past_due"])
      .order("seat_day", { ascending: false })
      .limit(20)
      .returns<Mine[]>();
    mine = data ?? [];
  } catch (err) {
    console.error("dashboard lookup failed", err);
  }

  const onBoard = mine.find((l) => l.seat_day === today) ?? null;
  // The most recent previous listing, used to offer a one-click return.
  const previous = mine.find((l) => l.seat_day !== today) ?? null;

  return (
    <main className="stage relative mx-auto w-full max-w-2xl px-5 py-12 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <header className="relative z-10 mt-6 mb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Your seat</h1>
        <p className="mt-2 text-[13px] text-muted">{email}</p>
      </header>

      {onBoard ? (
        <div className="relative z-10 rounded-2xl border border-gold-line bg-gold-soft p-5 card-shadow">
          <p className="text-[11px] tracking-wide text-gold uppercase">On the board today</p>
          <div className="mt-2 flex items-center gap-4">
            <span className="tnum text-3xl font-semibold text-gold">{onBoard.seat}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{onBoard.name}</span>
              <span className="block truncate text-[12px] text-muted">
                {displayDomain(onBoard.url)}
              </span>
            </span>
            <Link
              href={`/manage/${onBoard.manage_token}`}
              className="shrink-0 rounded-xl border border-edge bg-panel px-3.5 py-2 text-[12px] font-medium transition hover:border-edge-strong"
            >
              Manage
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Held until midnight UTC, then every seat frees up again.
          </p>
        </div>
      ) : previous ? (
        <div className="relative z-10 rounded-2xl border border-edge bg-panel p-5 card-shadow">
          <p className="text-[11px] tracking-wide text-muted uppercase">Not on today&apos;s board</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            The house was cleared at midnight. Take a seat again with the details you
            already have — no need to fill anything in.
          </p>
          <div className="mt-4">
            <ClaimAgain listingId={previous.id} name={previous.name} />
          </div>
          <p className="mt-2 text-center text-[11px] text-muted/70">
            Or{" "}
            <Link href="/" className="text-accent hover:underline">
              pick a specific seat
            </Link>{" "}
            from the board.
          </p>
        </div>
      ) : mine.length === 0 ? (
        <div className="relative z-10 rounded-2xl border border-dashed border-edge-strong/60 p-10 text-center">
          <p className="text-[15px] font-semibold">You don&apos;t have a seat yet.</p>
          <p className="mt-1.5 text-[13px] text-muted">Pick one from the board and claim it.</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-fg px-4 py-2.5 text-[13px] font-semibold text-bg-lift"
          >
            See the board
          </Link>
        </div>
      ) : null}

      {mine.length > 0 && (
        <ul className="relative z-10 mt-8 space-y-2">
          <li className="px-1 text-[11px] tracking-wide text-muted uppercase">Your days</li>
          {mine.map((l) => (
            <li key={l.id}>
              <Link
                href={`/manage/${l.manage_token}`}
                className="flex items-center gap-4 rounded-2xl border border-edge bg-panel p-4 card-shadow transition-all duration-200 hover:-translate-y-0.5 hover:card-shadow-lift"
              >
                <span className="tnum w-10 shrink-0 text-center text-[15px] font-semibold text-gold">
                  {l.seat ?? "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{l.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {displayDomain(l.url)}
                    {l.status !== "active" && ` · ${l.status}`}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-muted">Manage →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="relative z-10 mt-12 text-[11px] text-muted/60">{SITE.domain}</p>
    </main>
  );
}
