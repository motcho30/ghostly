export function daysSince(
  d: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d) : d;
  return Math.max(0, Math.floor((now.getTime() - t.getTime()) / 86_400_000));
}

export function postedLabel(d: Date | string | null | undefined): string {
  const n = daysSince(d);
  if (n == null) return "Date unknown";
  if (n === 0) return "Posted today";
  if (n === 1) return "Posted yesterday";
  if (n < 14) return `Posted ${n} days ago`;
  if (n < 60) return `Posted ${Math.round(n / 7)} weeks ago`;
  return `Open ${Math.round(n / 30)} months`;
}

export const remoteLabel: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On site",
  unknown: "",
};

export const fmt = (n: number) => n.toLocaleString("en-GB");

export function whenLabel(d: Date): string {
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const per100 = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 100) : 0;
