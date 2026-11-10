import { cookies } from "next/headers";

export const ANON_COOKIE = "gl_anon";
export const REF_COOKIE = "gl_ref";
export const SESSION_COOKIE = "gl_session";
export const ADMIN_COOKIE = "gl_admin";

/** The anonymous visitor id. proxy.ts sets it on the very first request. */
export async function anonId(): Promise<string> {
  return (await cookies()).get(ANON_COOKIE)?.value ?? "unknown";
}

export async function referralCodeCookie(): Promise<string | null> {
  return (await cookies()).get(REF_COOKIE)?.value ?? null;
}

export const secureCookie = process.env.NODE_ENV === "production";
