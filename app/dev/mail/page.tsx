import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { card, cx } from "@/components/ui";
import { flags } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dev mailbox",
  robots: { index: false },
};

/** Every email the app "sent" while no email provider is set. Off in production. */
export default async function DevMail() {
  if (!flags.devTools()) notFound();
  const db = await getDb();
  const mails = await db
    .select()
    .from(schema.outbox)
    .orderBy(desc(schema.outbox.id))
    .limit(30);
  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <h1 className="text-[24px] font-semibold">Dev mailbox</h1>
      <p className="text-[14px] text-muted">
        Newest first. Links inside work as real ones.
      </p>
      <div className="mt-4 space-y-4">
        {mails.map((m) => (
          <details
            key={m.id}
            className={cx(card, "p-4")}
            open={m.id === mails[0]?.id}
          >
            <summary className="cursor-pointer">
              <span className="font-medium">{m.subject}</span>
              <span className="ml-2 text-[13px] text-muted">
                to {m.to} · {m.kind} · {m.createdAt.toLocaleString("en-GB")}
              </span>
            </summary>
            <ul className="mt-3 space-y-1 text-[13px]">
              {[
                ...new Set(
                  [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]),
                ),
              ].map((href) => (
                <li key={href}>
                  <a href={href} className="break-all text-mint underline">
                    {href}
                  </a>
                </li>
              ))}
            </ul>
            <iframe
              title={m.subject}
              srcDoc={m.html}
              className="mt-3 h-[520px] w-full rounded-xl border border-line bg-bg"
              sandbox="allow-popups allow-top-navigation-by-user-activation"
            />
          </details>
        ))}
        {mails.length === 0 && <p className="text-muted">Nothing sent yet.</p>}
      </div>
    </main>
  );
}
