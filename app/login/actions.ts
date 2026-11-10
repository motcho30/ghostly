"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { endSession, sendMagicLink } from "@/lib/auth";

export async function requestLink(form: FormData) {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (email.success) await sendMagicLink(email.data);
  redirect("/login?sent=1");
}

export async function logOut() {
  await endSession();
  redirect("/");
}
