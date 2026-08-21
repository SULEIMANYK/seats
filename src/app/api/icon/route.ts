import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Serves a listing's icon from our own origin.
 *
 * Hotlinking Google's favicon service directly from the page had two problems:
 * it tells Google every domain each visitor sees, and when the service is slow
 * or redirects in a way the browser won't follow, every logo on the board goes
 * blank at once and the page looks broken. Fetching server-side lets us cache
 * the result and, more importantly, fall back to a generated letter tile so a
 * card is never empty.
 */

const SOURCES = (domain: string) => [
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
  `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
];

/** Deterministic hue per domain, so a site's tile colour is stable. */
function hueFor(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) % 360;
  return hash;
}

function letterTile(domain: string): NextResponse {
  const letter = (domain.replace(/^www\./, "")[0] ?? "?").toUpperCase();
  const hue = hueFor(domain);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="28" fill="hsl(${hue} 62% 92%)"/>
  <text x="64" y="64" fill="hsl(${hue} 55% 34%)" font-family="ui-sans-serif,system-ui,sans-serif"
        font-size="66" font-weight="600" text-anchor="middle" dominant-baseline="central">${letter}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml",
      // Short cache: a site that has no favicon today may add one tomorrow.
      "cache-control": "public, max-age=3600",
    },
  });
}

export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain")?.toLowerCase().trim();

  // Reject anything that isn't a plain hostname — this value ends up in an
  // outbound request, so it must never carry a path, scheme or credentials.
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || domain.length > 253) {
    return letterTile(domain ?? "?");
  }

  for (const source of SOURCES(domain)) {
    try {
      const res = await fetch(source, {
        redirect: "follow",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;

      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) continue;

      const body = await res.arrayBuffer();
      // Some services answer with a 1x1 placeholder rather than a 404.
      if (body.byteLength < 100) continue;

      return new NextResponse(body, {
        headers: {
          "content-type": type,
          "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
        },
      });
    } catch {
      // Try the next source.
    }
  }

  return letterTile(domain);
}
