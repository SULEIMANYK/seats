"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** One click to take a seat again with yesterday's details. */
export function ClaimAgain({ listingId, name }: { listingId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/reclaim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Could not claim a seat");
      return;
    }

    router.push(`/manage/${data.manageToken}?new=1`);
  }

  return (
    <div className="space-y-2">
      <button
        onClick={claim}
        disabled={busy}
        className="w-full rounded-xl bg-fg py-3 text-[13px] font-semibold text-bg-lift card-shadow transition hover:-translate-y-0.5 disabled:opacity-50"
      >
        {busy ? "Claiming…" : `Put ${name} back on the board`}
      </button>
      {error && (
        <p className="rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[12px] text-gold">
          {error}
        </p>
      )}
    </div>
  );
}
