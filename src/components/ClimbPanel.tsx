"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TIERS } from "@/lib/tiers";

export function ClimbPanel({
  token,
  currentCents,
}: {
  token: string;
  currentCents: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const higher = TIERS.filter((t) => t.cents > currentCents);

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

  if (higher.length === 0) {
    return (
      <p className="text-sm text-muted">
        You&apos;re at the top price. Nobody can outpay you — they can only match and wait.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        You&apos;re charged the difference for the rest of this month, and your new rank is
        live immediately.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {higher.map((tier) => (
          <button
            key={tier.cents}
            onClick={() => climb(tier.cents)}
            disabled={busy !== null}
            className="tnum rounded-lg border border-edge bg-panel px-2 py-2.5 text-sm transition hover:border-accent disabled:opacity-40"
          >
            {busy === tier.cents ? "…" : tier.label}
          </button>
        ))}
      </div>

      {result !== null && (
        <p className="rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-sm text-gold">
          Done — you&apos;re now #{result}.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-sm text-gold">
          {error}
        </p>
      )}
    </div>
  );
}
