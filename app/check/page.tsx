import type { Metadata } from "next";

import { CheckForm } from "@/components/check-form";
import { TrackView } from "@/components/client";
import { GhostIcon } from "@/components/ghost";
import { Section, SiteFooter, SiteHeader } from "@/components/site";
import { card, cx } from "@/components/ui";
import { fmt } from "@/lib/format";
import { siteStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/check" },
  title: "Is it worth applying? Free job checker",
  description:
    "Paste any job link or ad and see when it was really posted, whether you'd be early or too late, and any warning signs. Free.",
};

export default async function CheckPage() {
  const stats = await siteStats();
  return (
    <main className="glow flex min-h-dvh flex-col">
      <TrackView name="check_view" />
      <SiteHeader />
      <Section className="max-w-xl pt-8 pb-16">
        <GhostIcon className="float mx-auto h-14 w-14 text-violet" />
        <h1 className="mt-5 text-center text-[36px] font-semibold leading-tight tracking-tight">
          Is it{" "}
          <span className="font-serif font-normal italic text-mint">worth</span>{" "}
          applying?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-[16px] text-muted">
          Paste a job link or the ad. We check when it was really posted,
          whether you'd be early or too late, and any warning signs, like a
          repost or talent-pool wording.
        </p>
        <div className={cx(card, "mt-8 p-5")}>
          <CheckForm />
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            [fmt(stats.liveRoles), "live ads tracked, UK and US"],
            [fmt(stats.fresh24), "new roles in the last 24 hours"],
            [`${stats.medianAgeDays} days`, "typical ad age"],
          ].map(([n, l]) => (
            <div key={l} className={cx(card, "p-3")}>
              <div className="font-mono text-[18px] font-semibold">{n}</div>
              <div className="text-[12px] text-muted">{l}</div>
            </div>
          ))}
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
