"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SITE } from "@/lib/config";
import { CATEGORIES } from "@/lib/categories";
import { PRICING_MODELS } from "@/lib/pricing";
import { BOARD_SIZE } from "@/lib/seating";

/** Just enough of a board row to compute where a price would land. */

/** Best-effort domain for the favicon + preview while the URL is still being typed. */
export function SubmitForm({
  full,
  seat,
  email,
  taken: initialTaken,
}: {
  full: boolean;
  seat: number | null;
  email: string;
  taken: number[];
}) {
  const router = useRouter();
  // Rows, not raw tiers. A price between two row prices buys nothing extra —
  // $15 landed in the same row as $12, which reads as the form being broken.

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The seat being claimed. Null means "whichever is free when I submit",
  // which is still the default — picking one is an option, not a chore.
  const [chosen, setChosen] = useState<number | null>(seat);
  const [taken, setTaken] = useState<number[]>(initialTaken);
  // Set when the seat in the dropdown gets claimed by somebody else while
  // this form is open. Filling in a listing takes a minute, and finding out
  // at the last click that the seat went is the worst moment to find out.
  const [lost, setLost] = useState<number | null>(null);

  const takenSet = new Set(taken);

  const refreshSeats = useCallback(async () => {
    try {
      const res = await fetch("/api/seats", { cache: "no-store" });
      if (!res.ok) return;
      const data: { taken?: number[] } = await res.json();
      if (!Array.isArray(data.taken)) return;
      setTaken(data.taken);
      setChosen((current) => {
        if (current !== null && data.taken!.includes(current)) {
          setLost(current);
          return null;
        }
        return current;
      });
    } catch {
      // A failed poll is not worth surfacing: the submit itself still
      // refuses a taken seat, so this is an early warning, not the guard.
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refreshSeats, 15000);
    const onFocus = () => refreshSeats();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshSeats]);

  // What seat each price actually buys, computed the same way the chart
  // places listings — quoting anything else makes the two disagree.


  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        url: form.get("url"),
        tagline: form.get("tagline"),
        category: form.get("category") || null,
        logoUrl: form.get("logoUrl") || null,
        imageUrl: form.get("imageUrl") || null,
        description: form.get("description") || null,
        pricingModel: form.get("pricingModel") || null,
        docsUrl: form.get("docsUrl") || null,
        seat: chosen,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.needsAuth) {
        router.push(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      // The seat went in the moment between rendering and submitting.
      // Say which one, take it off the list, and drop back to "next free".
      if (data.seatTaken) {
        setTaken((t) => (t.includes(data.seatTaken) ? t : [...t, data.seatTaken]));
        setLost(data.seatTaken);
        setChosen(null);
        setError(null);
        setBusy(false);
        return;
      }
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }

    // Straight to the manage page: it is the only place the manage token is
    // ever shown, and it doubles as confirmation that the listing is up.
    router.push(`/manage/${data.manageToken}?new=1`);
  }

  const labelCls = "text-[11px] font-semibold tracking-wide text-muted uppercase";
  const inputCls =
    "w-full rounded-xl border border-edge bg-bg-lift px-3.5 py-3 text-[15px] text-fg outline-none placeholder:text-muted/50 transition-colors duration-200 focus:border-accent focus:bg-panel-hover focus:ring-4 focus:ring-accent/15";

  return (
    <div className="relative z-10 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-2.5 lg:order-2 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-gold-line bg-gold-soft p-5 card-shadow">
          <p className="text-[11px] tracking-wide text-gold uppercase">Free</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            No fee, no card, no plan. Add your listing and it goes up straight away.
          </p>
        </div>

        <div className="rounded-2xl border border-edge bg-panel p-5 card-shadow">
          <p className="text-[11px] tracking-wide text-muted uppercase">Where you sit</p>

          <p className="tnum mt-1.5 text-3xl font-semibold tracking-tight">
            {chosen === null ? "Next free seat" : `Seat ${chosen}`}
          </p>

          <label htmlFor="seatPick" className="sr-only">
            Choose a seat
          </label>
          <select
            id="seatPick"
            value={chosen ?? ""}
            onChange={(e) => {
              setChosen(e.target.value ? Number(e.target.value) : null);
              setLost(null);
            }}
            className="mt-2.5 w-full rounded-xl border border-edge bg-bg-lift px-3 py-2.5 text-[13px] text-fg outline-none transition-colors focus:border-accent"
          >
            <option value="">Next free seat</option>
            {Array.from({ length: BOARD_SIZE }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n} disabled={takenSet.has(n)}>
                Seat {n}
                {takenSet.has(n) ? " — taken" : ""}
              </option>
            ))}
          </select>

          {lost !== null ? (
            <p className="mt-2 rounded-xl border border-gold-line bg-gold-soft px-3 py-2 text-[12px] leading-relaxed text-gold">
              Seat {lost} was claimed while you were filling this in. You are set to the next
              free seat — pick a different one above if you would rather choose.
            </p>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {chosen === null
                ? "You take the next free seat, and it is yours until midnight UTC. No bidding and no ranking — just be early."
                : "Yours until midnight UTC, when every seat frees up again."}
            </p>
          )}

          <p className="tnum mt-2 text-[11px] text-muted/70">
            {BOARD_SIZE - taken.length} of {BOARD_SIZE} free right now
          </p>
        </div>

        <div className="rounded-2xl border border-edge bg-panel p-5 card-shadow">
          <p className="text-[11px] tracking-wide text-muted uppercase">What you get</p>
          <ul className="mt-2 space-y-1 text-[12px] leading-snug text-muted">
            <li>· Logo, tagline and a link people can click</li>
            <li>· Your click count, in public</li>
            <li>· UTM tagging so clicks land in your own analytics</li>
            <li>· An embeddable rank badge for your site</li>
          </ul>
        </div>
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
            <label htmlFor="description" className={labelCls}>
              More about it
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={600}
              className={`${inputCls} resize-y`}
              placeholder="What it does, who it's for, what makes it different."
            />
            <p className="text-[11px] text-muted/70">Optional. Up to 600 characters.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pricingModel" className={labelCls}>
              Pricing
            </label>
            <select id="pricingModel" name="pricingModel" defaultValue="" className={inputCls}>
              <option value="">Not specified</option>
              {PRICING_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="docsUrl" className={labelCls}>
              Docs or pricing page
            </label>
            <input id="docsUrl" name="docsUrl" className={inputCls} placeholder="https://acme.com/docs" />
            <p className="text-[11px] text-muted/70">Optional. A second link people can follow.</p>
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
            <label htmlFor="logoUrl" className={labelCls}>
              Logo URL
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              className={inputCls}
              placeholder="https://acme.com/logo.png"
            />
            <p className="text-[11px] text-muted/70">
              Optional. Without one we use your site&apos;s favicon.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="imageUrl" className={labelCls}>
              Screenshot URL
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              className={inputCls}
              placeholder="https://acme.com/screenshot.png"
            />
            <p className="text-[11px] text-muted/70">
              Optional. Shown if you land in the front row, where there&apos;s room for it.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">
              Account
            </span>
            <p className="rounded-xl border border-edge bg-bg px-3.5 py-3 text-[15px] text-muted">
              {email}
            </p>
            <p className="text-[11px] text-muted/70">
              Signed in. Up to two seats a day per account, and one seat per product — so nobody lists the same thing twice.
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
          {full ? "House full" : busy ? "Adding…" : chosen === null ? "Add my listing" : `Claim seat ${chosen}`}
        </button>

        <p className="text-center text-[11px] text-muted">
          Free. Remove it any time with your manage link.
        </p>
      </form>
    </div>
  );
}
