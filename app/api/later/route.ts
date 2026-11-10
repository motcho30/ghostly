import { and, eq, isNull } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { currentLead } from "@/lib/leads";
import { HOLD_HOURS } from "@/lib/pricing";

/** Starts the one-time "Maybe later" discount. A second call never extends it. */
export async function POST() {
  const lead = await currentLead();
  if (!lead) return Response.json({ error: "No search yet" }, { status: 404 });
  const db = await getDb();
  await db
    .update(schema.leads)
    .set({ laterOfferExpiresAt: new Date(Date.now() + HOLD_HOURS * 3_600_000) })
    .where(
      and(
        eq(schema.leads.id, lead.id),
        isNull(schema.leads.laterOfferExpiresAt),
      ),
    );
  return Response.json({ ok: true });
}
