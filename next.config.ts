import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) —
  // the Docker build copies only that output, not the full node_modules
  // tree. See Dockerfile.
  output: "standalone",
};

export default nextConfig;
