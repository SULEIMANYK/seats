/** Derives a URL-safe slug from a product name, with a short random suffix. */
export function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : suffix;
}

/** Normalises user-supplied URLs and rejects anything that isn't http(s). */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;

    // URL.toString() appends "/" to a bare host; strip it so the same site
    // typed two different ways stores identically.
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Canonical hostname used for one-slot-per-company dedupe. */
export function canonicalDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Accepts a user-supplied image URL, or null.
 *
 * Only https is allowed: an http image on an https page is blocked by the
 * browser anyway, and would show as a broken card rather than a picture.
 */
export function normalizeImageUrl(input: string | undefined | null): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  try {
    // Most people paste "acme.com/logo.png" without a scheme, and an http one
    // would be blocked by the browser on an https page — so assume https
    // rather than silently discarding what they typed.
    const withScheme = /^https?:\/\//i.test(raw) ? raw.replace(/^http:/i, "https:") : `https://${raw}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}
