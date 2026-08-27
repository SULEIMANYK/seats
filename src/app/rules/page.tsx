import Link from "next/link";
import { SITE } from "@/lib/config";
import { formatMoney, MIN_INCREMENT_CENTS, OPENING_BID_CENTS } from "@/lib/bidding";

export const metadata = { title: `Rules — ${SITE.domain}` };

const RULES: [string, string][] = [
  ["Rank is the money", "Listings are ordered by what they have paid, highest first. Nothing else moves you up."],
  ["Outbidding takes the rank", `You need at least ${formatMoney(MIN_INCREMENT_CENTS)} more than the listing you are passing. Equal is not enough — ties go to whoever bid first, and that is always the incumbent.`],
  ["Bids are final", "If someone outbids you, you lose the rank and the bid is not returned. That is what makes holding one worth anything. Know this before you bid."],
  ["One listing per domain", "A product cannot hold two ranks, and a domain cannot be listed twice."],
  ["Your manage link is your account", "There is nothing to sign in to. The link you get when you list is what edits, removes, and bids for your listing. Keep it."],
  ["Anything can be taken down", `Listings that mislead, impersonate, or point somewhere other than what they describe get removed from ${SITE.domain}. A removed listing is not refunded.`],
];

export default function RulesPage() {
  return (
    <main className="stage relative mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>

      <h1 className="relative z-10 mt-6 text-2xl sm:text-3xl">Rules</h1>
      <p className="relative z-10 mt-3 text-[15px] leading-relaxed text-muted">
        Short, because there are only a few and they all matter. Bids start at{" "}
        {formatMoney(OPENING_BID_CENTS)}.
      </p>

      <ol className="relative z-10 mt-8 space-y-3">
        {RULES.map(([title, body], i) => (
          <li key={title} className="rounded-2xl border border-edge bg-panel p-5 card-shadow">
            <span className="tnum font-display text-[13px] text-gold">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="mt-1 text-[16px]">{title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>

      <p className="relative z-10 mt-10 text-[12px] leading-relaxed text-muted/70">
        Payments are handled by Dodo Payments as merchant of record. Card details never reach{" "}
        {SITE.domain}.
      </p>
    </main>
  );
}
