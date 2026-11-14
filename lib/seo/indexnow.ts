import { POSTS } from "@/lib/blog/posts";
import { siteUrl } from "@/lib/brand";
import { indexablePaths } from "@/lib/seo/landing";

/**
 * IndexNow tells Bing (which also feeds ChatGPT search and Copilot), Yandex and
 * others that pages changed, instead of waiting for a crawl. The key is public
 * by design: it's served at /<key>.txt to prove we own the site.
 */
export const INDEXNOW_KEY = "a1eef6ccdc54b773f72c40fe4acae0a1";

export async function submitIndexNow(): Promise<Record<string, unknown>> {
  const base = siteUrl();
  if (base.includes("localhost")) return { skipped: "SITE_URL is not public" };
  const paths = [
    "/",
    "/jobs",
    "/hiring-now",
    "/check",
    "/blog",
    ...POSTS.map((p) => `/blog/${p.slug}`),
    ...(await indexablePaths()),
  ];
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(base).host,
      key: INDEXNOW_KEY,
      keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
      urlList: paths.slice(0, 10_000).map((p) => `${base}${p}`),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  return { submitted: paths.length, status: res.status };
}
