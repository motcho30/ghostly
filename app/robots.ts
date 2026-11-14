import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app",
        "/admin",
        "/api",
        "/auth",
        "/checkout",
        "/dev",
        "/login",
        "/plan",
        "/welcome",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
