import type { MetadataRoute } from "next";

import { POSTS } from "@/lib/blog/posts";
import { siteUrl } from "@/lib/brand";
import { indexablePaths } from "@/lib/seo/landing";
import { ghostIndex } from "@/lib/stats";

export const dynamic = "force-dynamic";

const STATIC: [
  string,
  MetadataRoute.Sitemap[number]["changeFrequency"],
  number,
][] = [
  ["/", "daily", 1],
  ["/start", "weekly", 0.9],
  ["/check", "weekly", 0.8],
  ["/hiring-now", "daily", 0.8],
  ["/blog", "weekly", 0.7],
  ["/how-we-score", "monthly", 0.5],
  ["/legal/terms", "yearly", 0.1],
  ["/legal/privacy", "yearly", 0.1],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const pages: MetadataRoute.Sitemap = STATIC.map(
    ([path, changeFrequency, priority]) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );
  for (const p of POSTS)
    pages.push({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.published),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  // City and role pages with enough live roles to be useful.
  const landing = await indexablePaths().catch(() => [] as string[]);
  pages.push({
    url: `${base}/jobs`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.9,
  });
  for (const path of landing)
    pages.push({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: path.split("/").length > 3 ? 0.6 : 0.8,
    });
  // Company pages with a real number of live roles. A database hiccup still
  // serves the rest of the sitemap.
  const companies = await ghostIndex(5).catch(() => []);
  for (const c of companies)
    pages.push({
      url: `${base}/companies/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.4,
    });
  return pages;
}
