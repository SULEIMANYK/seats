"use client";

import { useState } from "react";

/**
 * Buy a featured placement on the browse directory.
 *
 * Deliberately says what it does not buy. The board is the part of this site
 * people care about, and a payment button next to it invites the assumption
 * that money moves seats -- so the copy rules that out before it is asked.
 */
export function FeatureListing({
  token,
  isFeatured,
  pending,
}: {
  token: string;
  isFeatured: boolean;
  pending: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/featured/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not reach the payment provider.");
      setBusy(false);
    }
  }

  if (isFeatured) {
    return (
      <section className="relative z-10 mb-8 rounded-2xl border border-gold-line bg-gold-soft p-5 card-shadow">
        <p className="text-[11px] tracking-wide text-gold uppercase">Featured</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-fg/80">
          Your product sits at the top of the browse directory, permanently. The daily
          board is unaffected &mdash; seats there are still free and first-come.
        </p>
      </section>
    );
  }

  return (
    <section className="relative z-10 mb-8 rounded-2xl border border-edge bg-panel p-5 card-shadow">
      <h2 className="text-[13px] font-semibold">Feature on browse</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        $19 once, for a permanent pinned place at the top of the browse directory &mdash;
        the page holding every product that has ever held a seat.
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted/80">
        It does not move your seat. The fifty seats stay free and first-come, and nothing
        buys a place among them.
      </p>

      {pending && (
        <p className="mt-3 rounded-xl border border-gold-line bg-gold-soft px-3 py-2 text-[12px] leading-relaxed text-gold">
          If you have just paid, the placement appears as soon as the payment clears
          &mdash; usually seconds. Reload this page.
        </p>
      )}

      <button
        onClick={buy}
        disabled={busy}
        className="pill mt-4 bg-gold px-5 py-2.5 text-[13px] font-semibold text-[#141413] disabled:opacity-50"
      >
        {busy ? "Opening checkout…" : "Feature it — $19"}
      </button>

      {error && <p className="mt-2 text-[12px] text-red">{error}</p>}
    </section>
  );
}
