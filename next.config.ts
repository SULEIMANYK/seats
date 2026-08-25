import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There's a stray package-lock.json above this directory; pin the root so
  // Turbopack doesn't walk up and pick it as the workspace.
  turbopack: { root: __dirname },

  // Turbopack reuses the same chunk filenames across rebuilds, so a browser
  // that cached `[root-of-the-server]__xxxx.css` early in a session keeps
  // serving it after the file's contents have completely changed — a theme
  // rewrite shows up as the old theme. Only in dev; production filenames are
  // content-hashed and should stay cacheable.
  async headers() {
    const security = [
      // A manage URL carries a secret token in its path. The modern browser
      // default already withholds the path cross-origin, but stating it
      // leaves nothing to a default that could change.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Nothing here should ever be framed — a framed manage page is a
      // clickjacking route to someone else's listing.
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ];

    const rules = [{ source: "/:path*", headers: security }];

    if (process.env.NODE_ENV === "development") {
      // Turbopack reuses chunk filenames across rebuilds, so a cached asset
      // can outlive its contents. Only a problem while iterating.
      rules.push({
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      });
    }

    return rules;
  },
};

export default nextConfig;
