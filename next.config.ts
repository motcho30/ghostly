import type { NextConfig } from "next";

// Cache Components is off on purpose: almost every page here is per-visitor
// (quiz answers, paywall offer, member feed), so pages render at request time
// and the ones that read the database say `dynamic = "force-dynamic"`.
const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
