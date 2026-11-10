import { cookies } from "next/headers";

import { ADMIN_COOKIE } from "@/lib/cookies";
import { sha256 } from "@/lib/ids";

/** ADMIN_TOKEN in production. Locally "dev-admin", so /admin/enter?token=dev-admin works. */
export function adminToken(): string | null {
  return (
    process.env.ADMIN_TOKEN ||
    (process.env.NODE_ENV === "production" ? null : "dev-admin")
  );
}

export async function isAdmin(): Promise<boolean> {
  const token = adminToken();
  return Boolean(
    token && (await cookies()).get(ADMIN_COOKIE)?.value === sha256(token),
  );
}
