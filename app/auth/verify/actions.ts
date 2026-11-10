"use server";

import { redirect } from "next/navigation";

import { consumeMagicLink, startSession } from "@/lib/auth";

export async function verifyLink(form: FormData) {
  const userId = await consumeMagicLink(String(form.get("token") ?? ""));
  if (!userId) redirect("/login?expired=1");
  await startSession(userId);
  redirect("/app");
}
