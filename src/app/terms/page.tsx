import Link from "next/link";
import { SITE } from "@/lib/config";

export const metadata = { title: `Terms — ${SITE.domain}` };

export default function TermsPage() {
  return (
    <main className="stage relative mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
      <Link href="/" className="relative z-10 text-sm text-muted hover:text-fg">
        ← back to the board
      </Link>
      <h1 className="relative z-10 mt-6 text-2xl sm:text-3xl">Terms</h1>

      <div className="relative z-10 mt-6 space-y-5 text-[15px] leading-relaxed text-muted">
        <p>
          {SITE.domain} is a paid leaderboard. Listings are ordered by what each has paid. By
          placing a bid you agree to what follows.
        </p>

        <div>
          <h2 className="text-[16px]">Bids are final</h2>
          <p className="mt-1.5">
            A bid buys a position for as long as nobody pays more. If you are outbid you lose the
            position and the bid is not refunded. Bids are not deposits, credit, or a subscription,
            and they do not accrue.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">No guarantee of traffic</h2>
          <p className="mt-1.5">
            You are buying a position on a page. Nothing here promises clicks, customers, revenue,
            or any particular result. Click counts shown next to listings are what has been
            measured, not what you should expect.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">Removal</h2>
          <p className="mt-1.5">
            Listings that mislead, impersonate someone, or point somewhere other than what they
            describe are removed. So is anything unlawful. A removed listing is not refunded.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">Payments</h2>
          <p className="mt-1.5">
            Payments are processed by Dodo Payments as merchant of record. They handle the
            transaction, tax, and any refund they are obliged to make; card details never reach{" "}
            {SITE.domain}. Their terms apply to the payment itself.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">The board can change</h2>
          <p className="mt-1.5">
            Pricing, ranking, and the rules can change, and {SITE.domain} may stop operating. If
            it does, standing bids are not refunded. This is a small site, not an institution
            &mdash; bid what you would not mind losing.
          </p>
        </div>

        <div>
          <h2 className="text-[16px]">Liability</h2>
          <p className="mt-1.5">
            {SITE.domain} is provided as it is, with no warranty. Liability is limited to the
            amount you paid in the thirty days before whatever the claim is about.
          </p>
        </div>
      </div>
    </main>
  );
}
