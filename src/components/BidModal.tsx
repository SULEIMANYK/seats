"use client";

import { useEffect, useRef, useState } from "react";
import { MIN_INCREMENT_CENTS, formatMoney, priceToBeat } from "@/lib/bidding";

/**
 * The bid box.
 *
 * Enforces the rule in the input itself rather than only on submit: the field
 * opens at the smallest winning number, and anything below it is refused
 * before a checkout is ever opened. The server checks again, because a
 * disabled button is a courtesy and not a control.
 */
export function BidModal({
  open,
  onClose,
  rank,
  name,
  currentCents,
  token,
}: {
  open: boolean;
  onClose: () => void;
  rank: number | null;
  name: string;
  currentCents: number;
  token: string | null;
}) {
  const floor = priceToBeat(currentCents);
  const [dollars, setDollars] = useState(() => String(Math.ceil(floor / 100)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDollars(String(Math.ceil(floor / 100)));
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, floor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cents = Math.round(Number(dollars) * 100);
  const valid = Number.isFinite(cents) && cents >= floor;

  async function submit() {
    if (!valid || !token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, amountCents: cents }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open checkout.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not reach the payment provider.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#141413]/60 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Bid on rank ${rank ?? ""}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-edge bg-panel p-6 card-shadow-lift"
      >
        <p className="text-[11px] tracking-[0.18em] text-muted uppercase">
          {rank ? `Outbid rank #${rank}` : "Place a bid"}
        </p>
        <h2 className="mt-1 text-2xl">{name}</h2>

        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Currently held at{" "}
          <span className="font-semibold text-fg">{formatMoney(currentCents)}</span>. You need at
          least <span className="font-semibold text-gold">{formatMoney(floor)}</span> to take it
          &mdash; a dollar more than the holder.
        </p>

        <label htmlFor="bid" className="mt-5 block text-[11px] tracking-wide text-muted uppercase">
          Your bid
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-edge bg-bg-lift px-3.5 py-3 focus-within:border-gold">
          <span className="text-[17px] font-semibold text-muted">$</span>
          <input
            ref={inputRef}
            id="bid"
            type="number"
            inputMode="decimal"
            min={Math.ceil(floor / 100)}
            step={MIN_INCREMENT_CENTS / 100}
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="tnum w-full bg-transparent text-[17px] font-semibold text-fg outline-none"
          />
        </div>

        {!valid && (
          <p className="mt-2 text-[12px] text-red">
            Must be at least {formatMoney(floor)}.
          </p>
        )}
        {error && <p className="mt-2 text-[12px] text-red">{error}</p>}

        {!token && (
          <p className="mt-3 rounded-xl border border-gold-line bg-gold-soft px-3 py-2 text-[12px] leading-relaxed text-gold">
            Open your listing&apos;s manage link to bid &mdash; it is the credential that proves
            the product is yours.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={submit}
            disabled={!valid || busy || !token}
            className="pill flex-1 bg-gold py-3 text-[13px] font-semibold text-[#141413] disabled:opacity-40"
          >
            {busy ? "Opening…" : `Take it for ${formatMoney(cents || floor)}`}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-edge px-4 py-3 text-[13px] text-muted"
          >
            Cancel
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
          Bids are final. If someone outbids you later, you lose the rank and the bid is not
          returned &mdash; that is what makes holding one worth something.
        </p>
      </div>
    </div>
  );
}
