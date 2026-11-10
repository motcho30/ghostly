import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Fetches a page a visitor pasted, without letting the server be pointed at
 * internal addresses. Only http(s) on default ports, every redirect re-checked,
 * 8 second timeout, 2 MB cap. A DNS answer could still change between the check
 * and the fetch; put this behind an egress proxy before high traffic.
 */
const MAX_BYTES = 2_000_000;

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return privateV4(ip);
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return privateV4(v6.slice(7));
  return (
    v6 === "::1" ||
    v6 === "::" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80")
  );
}

async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("Only web links work here");
  if (url.port && url.port !== "80" && url.port !== "443")
    throw new Error("That link uses an unusual port");
  if (url.username || url.password)
    throw new Error("Links with passwords are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address)))
    throw new Error("That link points somewhere we can't check");
}

export async function safeFetchText(
  raw: string,
): Promise<{ url: string; status: number; body: string; contentType: string }> {
  let url = new URL(raw);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; GhostlessCheck/0.1; +https://ghostless.co/how-we-score)",
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "en-GB,en;q=0.9",
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location") as string, url);
      continue;
    }
    const reader = res.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return {
      url: url.toString(),
      status: res.status,
      body: Buffer.concat(chunks).toString("utf8"),
      contentType: res.headers.get("content-type") ?? "",
    };
  }
  throw new Error("Too many redirects");
}
