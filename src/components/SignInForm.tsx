"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";

/**
 * Magic-link sign-in. No password to choose, forget or leak — and it proves
 * the address is real, which is the point: one verified person, one set of
 * listings.
 */
export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-gold-line bg-gold-soft p-6 card-shadow">
        <h2 className="text-[15px] font-semibold">Check your email</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          We sent a link to <span className="font-medium text-fg">{email}</span>. Open it on
          this device and you&apos;ll be signed in. It expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[11px] font-semibold tracking-wide text-muted uppercase">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@acme.com"
          className="w-full rounded-xl border border-edge bg-bg-lift px-3.5 py-3 text-[15px] outline-none placeholder:text-muted/50 transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-gold-line bg-gold-soft px-3.5 py-2.5 text-[13px] text-gold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-fg py-3 text-sm font-semibold text-bg-lift card-shadow transition hover:-translate-y-0.5 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Email me a link"}
      </button>

      <p className="text-center text-[11px] text-muted">
        No password. We use your email to keep one person from listing the same product twice.
      </p>
    </form>
  );
}
