import type { Metadata } from "next";

import { Logo } from "@/components/ghost";
import { btn, card, cx } from "@/components/ui";
import { verifyLink } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

/**
 * A button, not an automatic sign-in: email scanners open links before people
 * do, and a plain GET would use the one-time link up.
 */
export default async function Verify({
  searchParams,
}: PageProps<"/auth/verify">) {
  const { token } = await searchParams;
  return (
    <main className="glow flex min-h-dvh items-center justify-center p-4">
      <form
        action={verifyLink}
        className={cx(card, "w-full max-w-[400px] p-6 text-center")}
      >
        <Logo />
        <h1 className="mt-5 text-[22px] font-semibold">One tap to sign in</h1>
        <input
          type="hidden"
          name="token"
          value={typeof token === "string" ? token : ""}
        />
        <button type="submit" className={cx(btn.primary, "mt-5 w-full")}>
          Continue to my live roles
        </button>
      </form>
    </main>
  );
}
