import { getDb, schema } from "@/lib/db";

/** Funnel events. Names are snake_case verbs, props are small and never hold emails. */
export async function track(
  name: string,
  props: Record<string, unknown> = {},
  who: { anonId?: string | null; userId?: string | null } = {},
) {
  try {
    const db = await getDb();
    await db.insert(schema.events).values({
      name,
      props,
      anonId: who.anonId ?? null,
      userId: who.userId ?? null,
    });
  } catch (error) {
    console.error("track failed", name, error);
  }
}
