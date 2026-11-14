import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow, Section, SiteFooter, SiteHeader } from "@/components/site";
import { card, cx } from "@/components/ui";
import { POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Job search blog",
  description:
    "Why applications go unanswered, when to apply, how long to wait and what to do when an employer ghosts you. Plain answers with sources.",
  alternates: { canonical: "/blog" },
};

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function BlogIndex() {
  return (
    <main className="glow flex min-h-dvh flex-col">
      <SiteHeader />
      <Section className="max-w-3xl pt-6 pb-16">
        <Eyebrow>Blog</Eyebrow>
        <h1 className="mt-2 text-[36px] font-semibold tracking-tight">
          Stop getting ghosted
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">
          Plain answers to the questions a quiet job search leaves you with.
        </p>
        <div className="mt-8 space-y-3">
          {POSTS.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className={cx(
                card,
                "block p-5 transition hover:border-violet/40",
              )}
            >
              <h2 className="text-[19px] font-semibold leading-snug">
                {p.title}
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                {p.description}
              </p>
              <p className="mt-2 text-[13px] text-faint">
                {date(p.published)} · {p.readMinutes} min read
              </p>
            </Link>
          ))}
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
