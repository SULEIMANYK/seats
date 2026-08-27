import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { SITE } from "@/lib/config";
import { getStats, recordVisit } from "@/lib/visits";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Leaderboard, type Row } from "@/components/Leaderboard";
import { ActivityFeed, type Activity } from "@/components/ActivityFeed";
import { StatsBar } from "@/components/StatsBar";
import { QuickAdd } from "@/components/QuickAdd";
import { formatMoney, priceToBeat } from "@/lib/bidding";

export const dynamic = "force-dynamic";

const COLUMNS =
  "id, slug, name, url, domain, tagline, logo_url, category, bid_cents, rank, clicks_total, clicks_24h, is_featured";

/** The day the board opened, for the "hours live" figure. */
const LAUNCH = Date.UTC(2026, 7, 21);

async function board(view: "leaderboard" | "leaderboard_today"): Promise<Row[]> {
  try {
    const { data, error } = await db().from(view).select(COLUMNS).order("rank").limit(200).returns<Row[]>();
    if (error) {
      console.error(`${view} query failed`, error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error(`${view} unavailable`, err);
    return [];
  }
}

async function recentBids(): Promise<Activity[]> {
  try {
    const { data } = await db()
      .from("bids")
      .select("amount_cents, created_at, listings(name)")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<{ amount_cents: number; created_at: string; listings: { name: string } | null }[]>();

    return (data ?? []).map((b) => ({
      name: b.listings?.name ?? "A listing",
      amount_cents: b.amount_cents,
      created_at: b.created_at,
    }));
  } catch {
    return [];
  }
}

async function totalBid(): Promise<number> {
  try {
    const { data } = await db().from("bids").select("amount_cents").returns<{ amount_cents: number }[]>();
    return (data ?? []).reduce((n, b) => n + b.amount_cents, 0);
  } catch {
    return 0;
  }
}

export default async function Home() {
  recordVisit("/", await headers());

  const [allTime, today, activity, revenue, stats] = await Promise.all([
    board("leaderboard"),
    board("leaderboard_today"),
    recentBids(),
    totalBid(),
    getStats(),
  ]);

  const now = Date.now();
  const topPrice = allTime[0]?.bid_cents ?? 0;

  return (
    <main className="stage relative min-h-screen">
      <header className="boards relative z-20 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-b-[2rem] px-4 py-3 text-fg sm:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-2xl font-semibold tracking-[-0.045em]">
          <Logo className="text-[20px]" />
          seats
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <Link href="/categories" className="hidden text-[12px] text-fg/55 transition hover:text-fg sm:block">
            categories
          </Link>
          <Link href="/about" className="hidden text-[12px] text-fg/55 transition hover:text-fg sm:block">
            about
          </Link>
          <Link
            href="/submit"
            className="pill bg-gold px-5 py-2 text-[13px] font-semibold text-[#141413]"
          >
            Get listed
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 pt-7 pb-16 sm:px-8">
        <section className="relative z-10 mb-7">
          <h1 className="text-[clamp(26px,4vw,40px)] leading-[1.05]">
            Just <span className="text-gold">outbid</span> your competition
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            A leaderboard you climb with money. Bid higher than the listing above you and you take
            its rank &mdash; {topPrice > 0 ? <>#1 currently stands at <span className="font-semibold text-fg">{formatMoney(topPrice)}</span>.</> : <>nobody holds #1 yet.</>}
          </p>
          <div className="mt-7">
            <QuickAdd />
            <p className="mt-2.5 text-[12px] text-muted/70">
              Free to list. Bidding is what moves you up.
            </p>
          </div>
        </section>

        <section className="relative z-10 mb-10">
          <StatsBar
            visitors={stats?.visits_total ?? 0}
            hoursSinceLaunch={Math.max(1, Math.floor((now - LAUNCH) / 3_600_000))}
            revenueCents={revenue}
            topCents={priceToBeat(topPrice)}
            listings={allTime.length}
          />
        </section>

        <section className="relative z-10 mb-12">
          <Leaderboard allTime={allTime} today={today} myToken={null} />
        </section>

        <section className="relative z-10 mb-12">
          <h2 className="mb-3 text-[15px]">Latest activity</h2>
          <ActivityFeed items={activity} now={now} />
        </section>

        <footer className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge pt-6 text-[12px] text-muted">
          <Link href="/rules" className="hover:text-fg">Rules</Link>
          <Link href="/terms" className="hover:text-fg">Terms</Link>
          <Link href="/privacy" className="hover:text-fg">Privacy</Link>
          <Link href="/categories" className="hover:text-fg">Categories</Link>
          <Link href="/browse" className="hover:text-fg">Browse</Link>
          <Link href="/stats" className="hover:text-fg">Live stats</Link>
          <span className="ml-auto text-muted/60">{SITE.domain}</span>
        </footer>
      </div>
    </main>
  );
}
