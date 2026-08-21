import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There's a stray package-lock.json above this directory; pin the root so
  // Turbopack doesn't walk up and pick it as the workspace.
  turbopack: { root: __dirname },
};

export default nextConfig;
