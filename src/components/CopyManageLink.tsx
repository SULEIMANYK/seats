"use client";

import { useState } from "react";

/**
 * This link is shown exactly once, right here. No email is sent, so
 * clipboard copy isn't a nicety — it's the only realistic way most people
 * actually keep it.
 */
export function CopyManageLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/manage/${token}`;
  const full = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permissions can fail silently — the raw link is still
      // right there in the code block for a manual copy.
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="block flex-1 truncate rounded-lg bg-bg px-3 py-2 font-mono text-xs text-accent">
        {path}
      </code>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
          copied
            ? "border border-gold-line bg-gold-soft text-gold"
            : "bg-fg text-bg-lift hover:opacity-90"
        }`}
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
