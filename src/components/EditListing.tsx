"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { PRICING_MODELS } from "@/lib/pricing";

type Listing = {
  name: string;
  tagline: string;
  description: string | null;
  category: string | null;
  pricing_model: string | null;
  logo_url: string | null;
  image_url: string | null;
  extra_links: { label: string; url: string }[];
};

export function EditListing({ token, listing }: { token: string; listing: Listing }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const field =
    "w-full rounded-xl border border-edge bg-bg-lift px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15";
  const label = "text-[11px] font-semibold tracking-wide text-muted uppercase";

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/listing", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        name: f.get("name"),
        tagline: f.get("tagline"),
        description: f.get("description"),
        category: f.get("category"),
        pricingModel: f.get("pricingModel"),
        logoUrl: f.get("logoUrl"),
        imageUrl: f.get("imageUrl"),
        docsUrl: f.get("docsUrl"),
      }),
    });

    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not save");
    setSaved(true);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/listing", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "Could not remove");
    }
    router.push("/dashboard");
  }

  return (
    <section className="relative z-10 mb-8 rounded-2xl border border-edge bg-panel p-5 card-shadow">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold">Edit listing</h2>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-edge px-3 py-1.5 text-[12px] text-muted transition hover:border-edge-strong hover:text-fg"
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>

      {!open ? (
        <p className="mt-1.5 text-[13px] text-muted">
          Change the name, tagline, images or category. The website address can&apos;t be
          changed — claim a new seat for a different product.
        </p>
      ) : (
        <>
          <form onSubmit={save} className="mt-4 space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="e-name" className={label}>Name</label>
              <input id="e-name" name="name" required maxLength={60} defaultValue={listing.name} className={field} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="e-tagline" className={label}>One line</label>
              <input id="e-tagline" name="tagline" required maxLength={160} defaultValue={listing.tagline} className={field} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="e-desc" className={label}>More about it</label>
              <textarea id="e-desc" name="description" rows={3} maxLength={600} defaultValue={listing.description ?? ""} className={`${field} resize-y`} />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="e-cat" className={label}>Category</label>
                <select id="e-cat" name="category" defaultValue={listing.category ?? ""} className={field}>
                  <option value="">No category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="e-price" className={label}>Pricing</label>
                <select id="e-price" name="pricingModel" defaultValue={listing.pricing_model ?? ""} className={field}>
                  <option value="">Not specified</option>
                  {PRICING_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="e-logo" className={label}>Logo URL</label>
              <input id="e-logo" name="logoUrl" defaultValue={listing.logo_url ?? ""} className={field} placeholder="https://…" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="e-img" className={label}>Screenshot URL</label>
              <input id="e-img" name="imageUrl" defaultValue={listing.image_url ?? ""} className={field} placeholder="https://…" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="e-docs" className={label}>Docs or pricing link</label>
              <input id="e-docs" name="docsUrl" defaultValue={listing.extra_links?.[0]?.url ?? ""} className={field} placeholder="https://…" />
            </div>

            {error && (
              <p className="rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[12px] text-gold">{error}</p>
            )}
            {saved && (
              <p className="rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[12px] text-gold">Saved.</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-fg py-2.5 text-[13px] font-semibold text-bg-lift transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>

          <div className="mt-6 border-t border-edge pt-4">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="text-[12px] text-muted underline-offset-4 transition hover:text-gold hover:underline"
              >
                Free my seat
              </button>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[12px] leading-relaxed text-muted">
                  Your seat goes back on the board for someone else, and the listing
                  comes off. Days already recorded in the archive stay as they were.
                  If you only want to sit somewhere else, move seat above instead.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2 text-[12px] font-semibold text-gold disabled:opacity-50"
                  >
                    {busy ? "Freeing…" : "Yes, free it"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded-xl border border-edge px-3.5 py-2 text-[12px] text-muted"
                  >
                    Keep my seat
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
