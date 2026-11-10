"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Not allowed");
}

/** Approve shows the review on the site. Reject deletes it. */
export async function setReview(id: string, approve: boolean) {
  await assertAdmin();
  const db = await getDb();
  if (approve)
    await db
      .update(schema.reviews)
      .set({ verified: true })
      .where(eq(schema.reviews.id, id));
  else await db.delete(schema.reviews).where(eq(schema.reviews.id, id));
  revalidatePath("/admin");
}
