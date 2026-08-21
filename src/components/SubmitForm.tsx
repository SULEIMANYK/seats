"use client";

import { useState } from "react";
import { SITE } from "@/lib/config";
import { formatPrice, TIERS } from "@/lib/tiers";

export function SubmitForm({
  minCents,
  defaultCents,
}: {
  minCents: number;
  defaultCents: number;
}) {
  const available = TIERS.filter((t) => t.cents >= minCents);
  const [cents, setCents] = useState(
    available.some((t) => t.cents === defaultCents) ? defaultCents : available[0]?.cents,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        url: form.get("url"),
        tagline: form.get("tagline"),
        email: form.get("email"),
        cents,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }

    window.location.href = data.url;
  }

  const field =
    "w-full rounded-lg border border-edge bg-panel px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" required maxLength={60} className={field} placeholder="Acme" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="url" className="text-sm font-medium">
          URL
        </label>
        <input id="url" name="url" required className={field} placeholder="acme.com" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tagline" className="text-sm font-medium">
          One line about it
        </label>
        <input
          id="tagline"
          name="tagline"
          required
          maxLength={160}
          className={field}
          placeholder={`What your ${SITE.noun} does, in one sentence.`}
        />
        <p className="text-xs text-muted">160 characters max.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required className={field} placeholder="you@acme.com" />
        <p className="text-xs text-muted">
          Used for your receipt and to reach you about your listing. Never shown publicly.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Monthly price</legend>
        <p className="text-xs text-muted">
          Higher price, higher rank. You can raise it any time.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5">
          {available.map((tier) => (
            <button
              key={tier.cents}
              type="button"
              onClick={() => setCents(tier.cents)}
              className={`tnum rounded-lg border px-2 py-2.5 text-sm transition ${
                cents === tier.cents
                  ? "border-accent bg-accent/10 text-fg"
                  : "border-edge bg-panel text-muted hover:border-muted"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-sm text-gold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !cents}
        className="w-full rounded-lg bg-fg py-2.5 text-sm font-medium text-bg transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Starting checkout…" : `Continue — ${cents ? formatPrice(cents) : ""}/mo`}
      </button>

      <p className="text-center text-xs text-muted">
        Cancel any time and keep your slot until the period ends.
      </p>
    </form>
  );
}
