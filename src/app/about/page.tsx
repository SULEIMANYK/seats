import Link from "next/link";
import { SITE } from "@/lib/config";
import { formatMoney, OPENING_BID_CENTS } from "@/lib/bidding";

export const metadata = { title: `About — ${SITE.domain}` };

export default function AboutPage() {
  return (
    <main className="stage relative mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <h1 className="relative z-10 mt-6 text-4xl">About</h1>

      <div className="relative z-10 mt-6 space-y-4 text-[15px] leading-relaxed text-muted">
        <p>
          {SITE.domain} is a leaderboard you climb with money. Every listing holds a rank, every
          rank has a price, and the price is whatever the listing holding it paid. Bid more than
          the one above you and you take its place.
        </p>
        <p>
          There is no algorithm and nothing to game. The order is the money, in public, which is
          the only ranking rule that cannot be argued with.
        </p>
        <p>
          Bids start at {formatMoney(OPENING_BID_CENTS)}. Ties go to whoever bid first, so being
          early is worth something when two people arrive at the same number.
        </p>
        <p>
          Every click your listing sends onward is counted and shown next to it, so the thing you
          are buying can be measured rather than assumed.
        </p>
      </div>

      <p className="relative z-10 mt-10">
        <Link
          href="/submit"
          className="pill inline-block bg-gold px-6 py-3 text-[14px] font-semibold text-[#141413]"
        >
          Get listed
        </Link>
      </p>
    </main>
  );
}
