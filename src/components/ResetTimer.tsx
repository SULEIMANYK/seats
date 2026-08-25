"use client";

import { useEffect, useState } from "react";

/**
 * Counts down to the nightly clear.
 *
 * Rendered empty on the server and filled in after mount: the server's clock
 * and the visitor's are never the same millisecond, and rendering a time on
 * both sides guarantees a hydration mismatch.
 */
function untilMidnightUTC(): { h: number; m: number; s: number; total: number } {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  );
  const total = Math.max(0, next - now.getTime());
  return {
    h: Math.floor(total / 3_600_000),
    m: Math.floor((total % 3_600_000) / 60_000),
    s: Math.floor((total % 60_000) / 1000),
    total,
  };
}

export function ResetTimer() {
  const [left, setLeft] = useState<ReturnType<typeof untilMidnightUTC> | null>(null);

  useEffect(() => {
    // Scheduled rather than set synchronously: a setState during the effect
    // itself triggers a cascading render.
    const first = setTimeout(() => setLeft(untilMidnightUTC()), 0);
    const id = setInterval(() => {
      const next = untilMidnightUTC();
      setLeft(next);
      // The board is server-rendered, so once the day rolls over the page is
      // stale — reload rather than show a fresh timer over yesterday's seats.
      if (next.total <= 1000) window.location.reload();
    }, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  // Reserve the space so the header does not jump when the clock appears.
  if (!left) {
    return <span className="tnum text-[11px] text-[#eef2ec]/60" aria-hidden>&nbsp;</span>;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const soon = left.total < 30 * 60_000;

  return (
    <span
      className={`tnum inline-flex items-center gap-1.5 text-[11px] ${
        soon ? "text-gold-line" : "text-[#eef2ec]/60"
      }`}
      title="Every seat is cleared at midnight UTC"
    >
      <span className="hidden sm:inline">clears in</span>
      <span className="font-medium">
        {pad(left.h)}:{pad(left.m)}:{pad(left.s)}
      </span>
    </span>
  );
}
