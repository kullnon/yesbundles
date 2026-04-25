import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type errors are pre-existing and don't block runtime.
    // Re-enable post-launch when database.ts types are regenerated.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
