"use client";

import { useState } from "react";
import { formatMoney, priceToBeat } from "@/lib/bidding";
import { BidModal } from "./BidModal";

/**
 * Bidding from the listing's own page, where the manage token is already in
 * hand. The board's own Outbid buttons cannot complete a bid on their own --
 * they open the box, but the credential lives here.
 */
export function BidBox({
  token,
  name,
  currentCents,
  rank,
  topCents,
  pending,
}: {
  token: string;
  name: string;
  currentCents: number;
  rank: number | null;
  topCents: number;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative z-10 mb-8 rounded-2xl border border-gold-line bg-gold-soft p-5 card-shadow">
      <p className="text-[11px] tracking-wide text-gold uppercase">Your rank</p>
      <p className="tnum font-display mt-1 text-2xl leading-none text-gold">
        {rank ? `#${rank}` : "unranked"}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-fg/80">
        {currentCents > 0 ? (
          <>
            Held at <span className="font-semibold">{formatMoney(currentCents)}</span>. Taking #1
            costs {formatMoney(priceToBeat(topCents))}.
          </>
        ) : (
          <>
            Not on the board yet. Any bid puts you on it; {formatMoney(priceToBeat(topCents))} puts
            you at the top.
          </>
        )}
      </p>

      {pending && (
        <p className="mt-3 rounded-xl border border-gold-line bg-bg-lift px-3 py-2 text-[12px] leading-relaxed text-gold">
          If you have just paid, your rank moves as soon as the payment clears. Reload this page.
        </p>
      )}

      <button
        onClick={() => setOpen(true)}
        className="pill mt-4 bg-gold px-5 py-2.5 text-[13px] font-semibold text-[#141413]"
      >
        {currentCents > 0 ? "Raise your bid" : "Place a bid"}
      </button>

      <BidModal
        open={open}
        onClose={() => setOpen(false)}
        rank={rank}
        name={name}
        currentCents={currentCents}
        token={token}
      />
    </section>
  );
}
