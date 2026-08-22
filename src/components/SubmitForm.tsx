"use client";

import { useMemo, useState } from "react";
import { SITE } from "@/lib/config";
import { CATEGORIES } from "@/lib/categories";
import { ROWS, seatIfPaying } from "@/lib/seating";
import { formatPrice } from "@/lib/tiers";

/** Just enough of a board row to compute where a price would land. */
export type PreviewRow = {
  id: string;
  tier_since: string;
  name: string;
  price_cents: number;
};

/** Best-effort domain for the favicon + preview while the URL is still being typed. */
function previewDomain(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "yoursite.com";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return trimmed;
  }
}

function faviconFor(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function PreviewCard({
  rank,
  name,
  tagline,
  domain,
  cents,
}: {
  rank: number;
  name: string;
  tagline: string;
  domain: string;
  cents?: number;
}) {
  const featured = rank <= 3;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-4 transition-colors duration-200 ${
        featured
          ? "border-gold-line bg-gold-soft card-shadow"
          : "border-edge bg-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`tnum leading-none font-semibold ${
            featured ? "text-[34px] text-gold" : "text-2xl text-muted"
          }`}
        >
          {rank}
        </span>
        {cents !== undefined && (
          <span
            className={`tnum rounded-full px-2 py-1 text-[11px] leading-none ${
              featured ? "bg-gold-soft text-gold" : "bg-faint text-muted"
            }`}
          >
            {formatPrice(cents)}/mo
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconFor(domain)}
          alt=""
          className="size-10 shrink-0 rounded-xl bg-bg object-contain p-1 ring-1 ring-edge"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">{name || "Your product"}</p>
          <p className="tnum truncate text-[11px] text-muted/70">{domain}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-snug text-muted">
        {tagline || `What your ${SITE.noun} does, in one sentence.`}
      </p>

      {featured && (
        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold uppercase">
          front row
        </span>
      )}
    </div>
  );
}

export function SubmitForm({
  rows,
  minCents,
  defaultCents,
}: {
  rows: PreviewRow[];
  minCents: number;
  defaultCents: number;
}) {
  // Rows, not raw tiers. A price between two row prices buys nothing extra —
  // $15 landed in the same row as $12, which reads as the form being broken.
  const available = useMemo(
    () =>
      ROWS.map((r) => ({ cents: r.askingCents, label: formatPrice(r.askingCents), row: r.label }))
        .filter((t) => t.cents >= minCents)
        .reverse(),
    [minCents],
  );

  const [cents, setCents] = useState(
    available.some((t) => t.cents === defaultCents) ? defaultCents : available[0]?.cents,
  );
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What seat each price actually buys, computed the same way the chart
  // places listings — quoting anything else makes the two disagree.
  const ranked = useMemo(
    () =>
      available.map((tier) => {
        const rank = seatIfPaying(tier.cents, rows);
        // Who currently holds the seat you would take — not simply anyone at
        // the same price, since matching a price seats you behind them.
        const displaces = rows.find((r) => r.price_cents > tier.cents) ?? null;
        return { ...tier, rank, displaces };
      }),
    [available, rows],
  );

  const selected = ranked.find((t) => t.cents === cents) ?? ranked[0];
  const domain = previewDomain(url);

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
      <aside className="space-y-3 lg:sticky lg:top-8 lg:order-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel px-2.5 py-1 text-[10px] tracking-wide text-muted uppercase backdrop-blur">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-gold" />
          </span>
          live preview
        </span>

        <PreviewCard rank={selected?.rank ?? 1} name={name} tagline={tagline} domain={domain} cents={cents} />

        <p className="px-1 text-[13px] leading-relaxed text-muted">
          {selected?.displaces ? (
            <>
              Takes <span className="tnum font-medium text-fg">#{selected.rank}</span> from{" "}
              <span className="font-medium text-fg">{selected.displaces.name}</span>, who drops to{" "}
              <span className="tnum font-medium text-fg">#{selected.rank + 1}</span>.
            </>
          ) : (
            <>
              Seat <span className="tnum font-medium text-fg">{selected?.rank}</span> in{" "}
              <span className="font-medium text-fg">
                {selected && (selected.row.length <= 2 ? `Row ${selected.row}` : selected.row.toLowerCase())}
              </span>
              nobody to pass.
            </>
          )}
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

        <fieldset className="space-y-3 rounded-2xl border border-edge bg-panel p-5 sm:p-6">
          <legend className="sr-only">Monthly price</legend>
          <div>
            <p className={labelCls}>Monthly price</p>
            <p className="mt-1 text-[13px] text-muted">
              Every row has its own price. Move forward any time.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-edge">
            {ranked.map((tier, i) => {
              const isSelected = tier.cents === cents;
              const featured = tier.rank <= 3;
              return (
                <button
                  key={tier.cents}
                  type="button"
                  onClick={() => setCents(tier.cents)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 ${
                    i !== 0 ? "border-t border-edge" : ""
                  } ${
                    isSelected
                      ? featured
                        ? "bg-gold-soft"
                        : "bg-accent/10"
                      : "bg-transparent hover:bg-panel-hover"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`tnum flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                        featured ? "bg-gold-soft text-gold" : isSelected ? "bg-accent/20 text-accent" : "bg-faint text-muted"
                      }`}
                    >
                      {tier.rank}
                    </span>
                    <span className="tnum text-sm font-medium text-fg">
                      {tier.label}
                      <span className="text-muted">/mo</span>
                    </span>
                  </span>

                  <span className={`truncate text-[11px] ${featured ? "text-gold" : "text-muted"}`}>
                    {tier.row.length <= 2 ? `Row ${tier.row}` : tier.row.toLowerCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p className="rounded-xl border border-gold-line bg-gold/5 px-3.5 py-2.5 text-sm text-gold">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !cents}
          className="w-full rounded-xl bg-fg py-3 text-sm font-semibold text-bg-lift card-shadow transition hover:-translate-y-0.5 hover:card-shadow-lift disabled:pointer-events-none disabled:opacity-50"
        >
          {busy ? "Starting checkout…" : `Continue — ${cents ? formatPrice(cents) : ""}/mo`}
        </button>

        <p className="text-center text-[11px] text-muted">
          Cancel any time and keep your slot until the period ends.
        </p>
      </form>
    </div>
  );
}
