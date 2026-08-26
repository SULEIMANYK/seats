"use client";

/**
 * The seats this browser has claimed.
 *
 * There are no accounts, so "your seats" is a list of manage tokens kept
 * locally. It is per-browser by nature: clear your storage and the listings
 * carry on existing, you just need the manage link to reach them again. That
 * is the honest trade for not asking anyone to sign in, and the manage link
 * is shown plainly at claim time for exactly this reason.
 */
const KEY = "seats.mine";

export type Mine = { token: string; name: string; day: string };

export function readMine(): Mine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Mine =>
        !!m && typeof (m as Mine).token === "string" && typeof (m as Mine).name === "string",
    );
  } catch {
    return [];
  }
}

export function rememberMine(entry: Mine) {
  if (typeof window === "undefined") return;
  try {
    // Newest first, deduped on token, and capped -- this is a convenience
    // list, not a record, and an unbounded one would eventually not fit.
    const next = [entry, ...readMine().filter((m) => m.token !== entry.token)].slice(0, 20);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked. Losing the shortcut is survivable; the
    // manage link still works and is shown on the listing's own page.
  }
}

export function forgetMine(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(readMine().filter((m) => m.token !== token)));
  } catch {
    // Same as above.
  }
}
