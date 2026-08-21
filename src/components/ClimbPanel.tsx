"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TierRank = {
  cents: number;
  label: string;
  rank: number;
};

export function ClimbPanel({
  token,
  tierRanks,
  currentRank,
}: {
  token: string;
  tierRanks: TierRank[];
  /** Where the listing sits right now, so we can spot climbs that buy nothing. */
  currentRank: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  async function climb(cents: number) {
    setBusy(cents);
    setError(null);

    const res = await fetch("/api/climb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, cents }),
    });

    const data = await res.json();
    setBusy(null);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    setResult(data.rank);
    router.refresh();
  }

  if (tierRanks.length === 0) {
    return (
      <div className="rounded-2xl border border-gold-line bg-gold-soft px-4 py-3.5 text-[13px] text-gold">
        You&apos;re at the top price. Nobody can outpay you — they can only match and wait.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        You&apos;re charged the difference for the rest of this month, and your new rank is
        live immediately.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tierRanks.map((tier) => {
          const top = tier.rank <= 3;
          // Prices are a ladder, ranks are not: paying more can tie with someone
          // who has held that price longer, leaving you exactly where you were.
          // Charging for that without saying so would be a con.
          const pointless = currentRank !== null && tier.rank >= currentRank;
          return (
            <button
              key={tier.cents}
              onClick={() => climb(tier.cents)}
              disabled={busy !== null || pointless}
              title={pointless ? "This price would not move you up" : undefined}
              className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 ${
                top
                  ? "border-gold-line bg-gold-soft hover:border-gold"
                  : "border-edge bg-panel hover:border-edge-strong hover:bg-panel-hover"
              }`}
            >
              <span className={`tnum text-sm font-semibold ${top ? "text-gold" : "text-fg"}`}>
                {busy === tier.cents ? "…" : `${tier.label}/mo`}
              </span>
              <span className={`tnum text-[11px] ${top ? "text-gold" : "text-muted"}`}>
                → {pointless ? "no change" : `#${tier.rank}`}
              </span>
            </button>
          );
        })}
      </div>

      {result !== null && (
        <p className="tnum rounded-xl border border-gold-line bg-gold-soft px-3 py-2.5 text-[13px] text-gold">
          You&apos;re on the move — now #{result}.
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-edge-strong bg-panel px-3 py-2.5 text-[13px] text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
