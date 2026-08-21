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
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
