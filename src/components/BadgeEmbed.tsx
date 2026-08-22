"use client";

import { useState } from "react";

/**
 * The badge, plus copy-paste snippets.
 *
 * This is the growth loop made concrete: a subscriber puts their rank on
 * their own homepage, which is a trust signal for them and inbound traffic
 * for the board. Making it one click to copy is most of whether it happens.
 */
export function BadgeEmbed({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window === "undefined" ? "https://seats.lol" : window.location.origin;
  const img = `${origin}/api/badge/${slug}`;
  const link = `${origin}/`;

  const snippets = [
    { id: "html", label: "HTML", code: `<a href="${link}"><img src="${img}" alt="Ranked on seats.lol" height="24"></a>` },
    { id: "md", label: "Markdown", code: `[![Ranked on seats.lol](${img})](${link})` },
  ];

  async function copy(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section className="relative z-10 mb-8 rounded-2xl border border-edge bg-panel p-5 card-shadow">
      <h2 className="text-[13px] font-semibold">Your badge</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Put your rank on your own site. It updates itself as you move.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="Your rank badge" height={24} className="mt-4" />

      <div className="mt-4 space-y-2">
        {snippets.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-bg px-3 py-2 font-mono text-[11px] text-muted">
              {s.code}
            </code>
            <button
              onClick={() => copy(s.id, s.code)}
              className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium transition ${
                copied === s.id
                  ? "border border-gold-line bg-gold-soft text-gold"
                  : "bg-fg text-bg-lift hover:opacity-90"
              }`}
            >
              {copied === s.id ? "Copied" : s.label}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
