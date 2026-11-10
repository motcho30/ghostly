import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site";
import { btn, card, cx, input } from "@/components/ui";
import { flags } from "@/lib/brand";
import { requestLink } from "./actions";

export const metadata: Metadata = { title: "Log in" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const sent = sp.sent === "1";
  return (
    <main className="glow flex min-h-dvh flex-col">
      <SiteHeader right={<span />} />
      <div className="mx-auto mt-10 w-full max-w-[420px] px-4">
        <div className={cx(card, "p-6")}>
          {sent ? (
            <>
              <h1 className="text-[24px] font-semibold">Check your email</h1>
              <p className="mt-2 text-[15px] text-muted">
                If that email has an account, a sign-in link is on its way. It
                works once and lasts 30 minutes.
              </p>
              {flags.devTools() && !flags.email() && (
                <Link href="/dev/mail" className={cx(btn.ghost, "mt-5")}>
                  Open the dev mailbox
                </Link>
              )}
            </>
          ) : (
            <>
              <h1 className="text-[24px] font-semibold">Log in</h1>
              {sp.paid === "1" && (
                <p className="mt-2 text-[14px] text-mint">
                  Payment received. Enter the email you paid with and we'll send
                  your sign-in link.
                </p>
              )}
              {sp.expired === "1" && (
                <p className="mt-2 text-[14px] text-amber">
                  That link has expired or was used already. Get a new one
                  below.
                </p>
              )}
              <p className="mt-2 text-[15px] text-muted">
                No passwords. We email you a link.
              </p>
              <form action={requestLink} className="mt-5">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  className={input}
                  aria-label="Email"
                />
                <button
                  type="submit"
                  className={cx(btn.primary, "mt-3 w-full")}
                >
                  Email me a sign-in link
                </button>
              </form>
              <p className="mt-5 text-center text-[14px] text-muted">
                New here?{" "}
                <Link href="/start" className="text-text underline">
                  Find your live roles
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
