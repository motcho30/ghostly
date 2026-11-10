import { NextResponse } from "next/server";

/** Referral links: /r/<code> keeps the code for 30 days and opens the landing page. */
export async function GET(req: Request, { params }: RouteContext<"/r/[code]">) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/", req.url));
  if (/^[a-z0-9]{4,16}$/i.test(code)) {
    res.cookies.set("gl_ref", code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  return res;
}
