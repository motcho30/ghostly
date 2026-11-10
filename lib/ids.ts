import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const token = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) =>
  createHash("sha256").update(s).digest("hex");

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function shortId(len = 8): string {
  const b = randomBytes(len);
  return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
}

function secret() {
  return process.env.APP_SECRET || "dev-only-secret-change-me";
}

/** A tamper-proof token for short-lived payloads such as a test checkout. */
export function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function unsign<T>(value: string): T | null {
  const [body, mac] = value.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
