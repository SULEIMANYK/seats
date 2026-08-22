"use client";

import { useState } from "react";
import { SITE } from "@/lib/config";
import { CATEGORIES } from "@/lib/categories";
import { ROWS } from "@/lib/seating";
import { formatPrice } from "@/lib/tiers";

/** Just enough of a board row to compute where a price would land. */

/** Best-effort domain for the favicon + preview while the URL is still being typed. */
export function SubmitForm({ full, defaultCents }: { full: boolean; defaultCents: number }) {
  const [cents, setCents] = useState(defaultCents);
  // Rows, not raw tiers. A price between two row prices buys nothing extra —
  // $15 landed in the same row as $12, which reads as the form being broken.

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What seat each price actually buys, computed the same way the chart
  // places listings — quoting anything else makes the two disagree.


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
        category: form.get("category") || null,
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

  const labelCls = "text-[11px] font-semibold tracking-wide text-muted uppercase";
  const inputCls =
    "w-full rounded-xl border border-edge bg-bg-lift px-3.5 py-3 text-[15px] text-fg outline-none placeholder:text-muted/50 transition-colors duration-200 focus:border-accent focus:bg-panel-hover focus:ring-4 focus:ring-accent/15";

  return (
    <div className="relative z-10 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-2 lg:order-2 lg:sticky lg:top-6 lg:self-start">
        <p className="px-1 text-[11px] tracking-wide text-muted uppercase">Choose a row</p>

        {ROWS.map((r) => {
          const active = cents === r.askingCents;
          const label = r.label.length <= 2 ? `Row ${r.label}` : r.label;
          return (
            <button
              key={r.label}
              type="button"
              onClick={() => setCents(r.askingCents)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                active
                  ? "border-gold-line bg-gold-soft card-shadow"
                  : "border-edge bg-panel hover:border-edge-strong"
              }`}
            >
              <span className="text-[13px] font-medium">{label}</span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-faint px-1.5 py-0.5 text-[10px] text-muted">
                  {r.plan}
                </span>
                <span className="tnum text-[13px] font-semibold">
                  {formatPrice(r.askingCents)}
                </span>
              </span>
            </button>
          );
        })}

        <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted/80">
          The row you pay for is the row you sit in, and it decides which tools come with
          the seat. Move forward any time from your manage link.
        </p>
      </aside>

      <form onSubmit={onSubmit} className="space-y-6 lg:order-1">
        <div className="space-y-4 rounded-2xl border border-edge bg-panel p-5 sm:p-6">
          <div className="space-y-1.5">
            <label htmlFor="name" className={labelCls}>
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Acme"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="url" className={labelCls}>
              URL
            </label>
            <input
              id="url"
              name="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls}
              placeholder="acme.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tagline" className={labelCls}>
              One line about it
            </label>
            <input
              id="tagline"
              name="tagline"
              required
              maxLength={160}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={inputCls}
              placeholder={`What your ${SITE.noun} does, in one sentence.`}
            />
            <p className="tnum text-[11px] text-muted/70">{tagline.length}/160</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category" className={labelCls}>
              Category
            </label>
            <select id="category" name="category" defaultValue="" className={inputCls}>
              <option value="">No category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted/70">
              Optional. Shown on your listing and on the stats page.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputCls} placeholder="you@acme.com" />
            <p className="text-[11px] text-muted/70">
              Used for your receipt and to reach you about your listing. Never shown publicly.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-gold-line bg-gold/5 px-3.5 py-2.5 text-sm text-gold">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || full}
          className="w-full rounded-xl bg-fg py-3 text-sm font-semibold text-bg-lift card-shadow transition hover:-translate-y-0.5 hover:card-shadow-lift disabled:pointer-events-none disabled:opacity-50"
        >
          {full ? "House full" : busy ? "Starting checkout…" : `Continue — ${formatPrice(cents)}/mo`}
        </button>

        <p className="text-center text-[11px] text-muted">
          Cancel any time and keep your seat until the period ends.
        </p>
      </form>
    </div>
  );
}
