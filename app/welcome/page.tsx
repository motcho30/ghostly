import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ShareButtons, TrackView } from "@/components/client";
import { GhostIcon } from "@/components/ghost";
import { btn, card, cx } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { flags, siteUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You're in" };

export default async function Welcome() {
  const me = await currentUser();
  if (!me) redirect("/login");
  const link = `${siteUrl()}/r/${me.user.referralCode}`;
  return (
    <main className="glow flex min-h-dvh items-center justify-center p-4">
      <TrackView name="welcome_view" />
      <div className="w-full max-w-[460px] text-center">
        <GhostIcon className="float mx-auto h-16 w-16 text-mint" crossed />
        <h1 className="mt-5 text-[30px] font-semibold">
          You're in{me.user.name ? `, ${me.user.name}` : ""}.
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Your live roles are ready.{" "}
          {flags.email() ? (
            <>
              We also emailed a sign-in link to{" "}
              <span className="text-text">{me.user.email}</span> for your other
              devices.
            </>
          ) : (
            <>
              You're signed in on this device as{" "}
              <span className="text-text">{me.user.email}</span>.
            </>
          )}
        </p>
        <Link href="/app" className={cx(btn.primary, "mt-6 w-full")}>
          See my live roles
        </Link>
        <div className={cx(card, "mt-8 p-5 text-left")}>
          <p className="font-semibold">
            Know someone stuck applying into the void?
          </p>
          <p className="mt-1 text-[14px] text-muted">
            Send them your link. They get their first week free, and you get a
            free week when they join.
          </p>
          <p className="mt-3 truncate rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] text-muted">
            {link}
          </p>
          <div className="mt-3">
            <ShareButtons
              url={link}
              text="Stop getting ghosted. This sends you new UK and US roles the hour they go live:"
              event="referral_share"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
