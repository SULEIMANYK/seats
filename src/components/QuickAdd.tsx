"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The shortest path from landing to listed: one field.
 *
 * It does not create anything -- it carries the URL to the full form, which
 * still asks for a name and a tagline. Asking for a URL first is the point:
 * it is the one thing every visitor already has in their clipboard, and the
 * rest is easier to fill in once you are committed.
 */
export function QuickAdd() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    router.push(`/submit?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={go} className="flex w-full max-w-lg flex-col gap-2.5 sm:flex-row">
      <label htmlFor="quick-url" className="sr-only">
        Your product&apos;s address
      </label>
      <input
        id="quick-url"
        type="text"
        inputMode="url"
        autoComplete="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="yourproduct.com"
        className="min-w-0 flex-1 rounded-full border border-edge bg-panel px-5 py-3.5 text-[15px] text-fg placeholder:text-muted/60 outline-none transition focus:border-gold"
      />
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="pill shrink-0 bg-gold px-6 py-3.5 text-[14px] font-semibold whitespace-nowrap text-[#141413] disabled:opacity-50"
      >
        {busy ? "Right then…" : "Get listed"}
      </button>
    </form>
  );
}
