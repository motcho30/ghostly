import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { Logo } from "./ghost";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
      <Logo />
      <nav className="flex items-center gap-4 text-[14px]">
        {right ?? (
          <>
            <Link href="/check" className="text-muted hover:text-text">
              Is it worth applying?
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-line px-3.5 py-1.5 text-text hover:border-faint"
            >
              Log in
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 text-[14px] text-muted sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-faint">
            New UK and US roles straight from company careers pages, sent the
            hour they go live. Not affiliated with the companies shown.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/check">Is it worth applying?</Link>
          <Link href="/hiring-now">Hiring now</Link>
          <Link href="/how-we-score">How we judge timing</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/start">{BRAND.cta}</Link>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/subscriptions">Renewals and cancelling</Link>
          <Link href="/legal/reviews">Reviews policy</Link>
        </div>
      </div>
    </footer>
  );
}

export function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-5xl px-4 ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-violet">
      {children}
    </p>
  );
}
