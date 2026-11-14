import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaLink } from "@/components/client";
import { breadcrumbs, faqPage, JsonLd } from "@/components/json-ld";
import { Eyebrow, Section, SiteFooter, SiteHeader } from "@/components/site";
import { btn, card, cx } from "@/components/ui";
import { type Block, POSTS, postBySlug, SOURCES } from "@/lib/blog/posts";
import { BRAND, siteUrl } from "@/lib/brand";

const JOB_LINKS: [string, string][] = [
  ["/jobs/london", "Jobs in London"],
  ["/jobs/new-york", "Jobs in New York"],
  ["/jobs/remote-uk", "Remote jobs, UK"],
  ["/jobs/remote-us", "Remote jobs, US"],
  ["/jobs", "All job searches"],
];

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      url: `/blog/${post.slug}`,
      siteName: BRAND.name,
    },
  };
}

function Render({ block, slug }: { block: Block; slug: string }) {
  if (block.type === "h2")
    return <h2 className="mt-9 text-[22px] font-semibold">{block.text}</h2>;
  if (block.type === "list")
    return (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-muted">
        {block.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    );
  if (block.type === "cta")
    return (
      <div className={cx(card, "mt-6 border-violet/30 bg-violet/5 p-5")}>
        <p className="text-[15px] font-medium leading-relaxed">{block.text}</p>
        <CtaLink
          href={block.href}
          where={`blog:${slug}`}
          className={cx(btn.primary, "mt-3")}
        >
          {block.label}
        </CtaLink>
      </div>
    );
  return (
    <p className="mt-4 text-[16px] leading-relaxed text-muted">{block.text}</p>
  );
}

export default async function BlogPost({ params }: PageProps<"/blog/[slug]">) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const url = `${siteUrl()}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.published,
    mainEntityOfPage: url,
    url,
    keywords: post.keywords.join(", "),
    author: { "@type": "Organization", name: BRAND.name, url: siteUrl() },
    publisher: { "@type": "Organization", name: BRAND.name, url: siteUrl() },
  };
  const others = POSTS.filter((p) => p.slug !== post.slug);

  return (
    <main className="glow flex min-h-dvh flex-col">
      <SiteHeader />
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbs(siteUrl(), [
          ["Home", "/"],
          ["Blog", "/blog"],
          [post.title, `/blog/${post.slug}`],
        ])}
      />
      {post.faq && <JsonLd data={faqPage(post.faq)} />}
      <Section className="max-w-3xl pt-6 pb-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" /> All posts
        </Link>
        <article className="mt-4">
          <Eyebrow>{post.readMinutes} min read</Eyebrow>
          <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight">
            {post.title}
          </h1>
          {post.body.map((b, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static content, order never changes
            <Render key={i} block={b} slug={post.slug} />
          ))}
          {post.faq && (
            <>
              <h2 className="mt-10 text-[22px] font-semibold">Quick answers</h2>
              <div className="mt-3 space-y-3">
                {post.faq.map((f) => (
                  <div key={f.q} className={cx(card, "p-5")}>
                    <h3 className="font-medium">{f.q}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                      {f.a}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-8 flex flex-wrap gap-2 text-[14px]">
            {JOB_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-line bg-white px-3.5 py-1.5 hover:border-faint"
              >
                {label}
              </Link>
            ))}
          </div>
          <h2 className="mt-10 text-[16px] font-semibold">Sources</h2>
          <ul className="mt-2 space-y-1 text-[14px] text-muted">
            {Object.values(SOURCES).map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {s.name}
                </a>
              </li>
            ))}
            <li>
              <Link href="/how-we-score" className="underline">
                How we judge timing, with caveats
              </Link>
            </li>
          </ul>
        </article>

        <h2 className="mt-12 text-[18px] font-semibold">Keep reading</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {others.slice(0, 6).map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className={cx(
                card,
                "block p-4 text-[15px] font-medium hover:border-violet/40",
              )}
            >
              {p.title}
            </Link>
          ))}
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
