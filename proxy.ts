import { type NextRequest, NextResponse } from "next/server";

const ANON = "gl_anon";
const REF = "gl_ref";
const YEAR = 60 * 60 * 24 * 365;

/**
 * Gives every visitor a stable anonymous id (for A/B arms and the funnel) and
 * keeps a ?ref= referral code for 30 days. The id is also put on the request,
 * so the very first page render can read it.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(ANON)?.value;
  const ref = request.nextUrl.searchParams.get("ref");
  const id = existing ?? crypto.randomUUID();
  if (!existing) request.cookies.set(ANON, id);
  if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) request.cookies.set(REF, ref);

  const response = NextResponse.next({ request: { headers: request.headers } });
  const secure = process.env.NODE_ENV === "production";
  if (!existing)
    response.cookies.set(ANON, id, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: YEAR,
      path: "/",
    });
  if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) {
    response.cookies.set(REF, ref, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp)$).*)",
  ],
};
