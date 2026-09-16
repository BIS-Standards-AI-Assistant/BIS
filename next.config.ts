import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) —
  // the Docker build copies only that output, not the full node_modules
  // tree. See Dockerfile. Skipped on Vercel: it has its own output tracing
  // and standalone mode breaks its build step (missing .nft.json).
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
