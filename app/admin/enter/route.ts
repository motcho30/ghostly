import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { adminToken } from "@/lib/admin";
import { ADMIN_COOKIE } from "@/lib/cookies";
import { sha256 } from "@/lib/ids";

/** /admin/enter?token=<ADMIN_TOKEN> sets the admin cookie for 12 hours. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = adminToken();
  const given = url.searchParams.get("token") ?? "";
  const ok =
    token &&
    given.length === token.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(token));
  if (!ok) return new Response("Not found", { status: 404 });
  const res = NextResponse.redirect(new URL("/admin", url));
  res.cookies.set(ADMIN_COOKIE, sha256(token), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 3600,
    path: "/",
  });
  return res;
}
