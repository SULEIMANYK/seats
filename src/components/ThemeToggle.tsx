"use client";

import { useEffect, useState } from "react";

type Choice = "light" | "dark" | null;

/**
 * Light/dark switch.
 *
 * Null means "follow the system", which is the default and is not stored —
 * only an explicit choice is written, so someone who never touches this keeps
 * tracking their OS rather than being frozen at whatever it was on first
 * visit.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Scheduled rather than set synchronously: a setState during the effect
    // itself triggers a cascading render.
    const id = setTimeout(() => {
      const saved = localStorage.getItem("theme");
      setChoice(saved === "dark" || saved === "light" ? saved : null);
      setReady(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function pick(next: Choice) {
    setChoice(next);
    const root = document.documentElement;
    if (next) {
      localStorage.setItem("theme", next);
      root.setAttribute("data-theme", next);
    } else {
      localStorage.removeItem("theme");
      root.removeAttribute("data-theme");
    }
  }

  // Reserve the width so the stage bar does not shift when this appears.
  if (!ready) return <span className="inline-block w-[42px]" aria-hidden />;

  const isDark =
    choice === "dark" ||
    (choice === null && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      onClick={() => pick(isDark ? "light" : "dark")}
      title={choice === null ? "Following your system" : `Switch to ${isDark ? "light" : "dark"}`}
      aria-label="Toggle theme"
      className="inline-flex size-7 items-center justify-center rounded-full border border-[#fdf0d8]/20 text-[#fdf0d8]/70 transition hover:border-[#fdf0d8]/40 hover:text-[#fdf0d8]"
    >
      {isDark ? (
        <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden>
          <circle cx="10" cy="10" r="4" />
          <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.9 3.9l1.4 1.4M14.7 14.7l1.4 1.4M16.1 3.9l-1.4 1.4M5.3 14.7l-1.4 1.4"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden>
          <path d="M17 12.3A7.5 7.5 0 0 1 7.7 3 7.5 7.5 0 1 0 17 12.3z" />
        </svg>
      )}
    </button>
  );
}
