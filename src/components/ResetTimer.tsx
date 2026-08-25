"use client";

import { useEffect, useRef, useState } from "react";

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
  const day = useRef<string | null>(null);

  useEffect(() => {
    // Scheduled rather than set synchronously: a setState during the effect
    // itself triggers a cascading render.
    const first = setTimeout(() => setLeft(untilMidnightUTC()), 0);
    day.current = new Date().toISOString().slice(0, 10);

    const id = setInterval(() => {
      const next = untilMidnightUTC();
      setLeft(next);

      // The board is server-rendered, so once the day rolls over the page is
      // stale — reload rather than show a fresh timer over yesterday's seats.
      //
      // Keyed on the UTC date changing, not on the countdown reaching zero.
      // Reloading at `total <= 1000` fired in the last second *before*
      // midnight, so the request arrived while the server still called it
      // yesterday: the page came back with the old board, the countdown
      // jumped to ~24h, and nothing reloaded again. Whoever was watching sat
      // on yesterday's seats until they refreshed by hand.
      const now = new Date().toISOString().slice(0, 10);
      if (day.current && now !== day.current) {
        day.current = now;
        window.location.reload();
      }
    }, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  // Reserve the space so the header does not jump when the clock appears.
  if (!left) {
    return (
      <span className="tnum block h-[34px] text-center text-[26px] leading-[34px]" aria-hidden>
        &nbsp;
      </span>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  // Under half an hour the clear stops being trivia and starts being news.
  const soon = left.total < 30 * 60_000;

  return (
    <span
      className="flex min-w-0 items-center justify-center gap-2.5 sm:gap-3.5"
      title="Every seat is cleared at midnight UTC"
    >
      <span className="hidden text-[10px] tracking-[0.18em] text-fg/40 uppercase sm:inline">
        every seat clears in
      </span>
      <span className="sr-only">Every seat clears in</span>

      {/* Anton, tabular, and big enough to be the thing you look at. The
          segments are separate so the colons do not jitter as digits change
          width -- tabular-nums fixes the digits, not the punctuation. */}
      <span
        className={`tnum font-display inline-flex items-baseline gap-0.5 text-[26px] leading-none tracking-tight tabular-nums sm:text-[30px] ${
          soon ? "text-gold" : "text-fg"
        }`}
      >
        <span>{pad(left.h)}</span>
        <span className="text-fg/25">:</span>
        <span>{pad(left.m)}</span>
        <span className="text-fg/25">:</span>
        <span>{pad(left.s)}</span>
      </span>
    </span>
  );
}
