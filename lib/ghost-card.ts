/**
 * The Ghost Count card lives in the URL, so it needs no database row and holds
 * no personal data: /ghosted/<sent>-<ghosted>-<period>, where period is months
 * ("4") or weeks ("3w"). Numbers are clamped so a card can't claim nonsense.
 */
export type GhostCard = {
  sent: number;
  ghosted: number;
  period: number;
  unit: "months" | "weeks";
};

const RE = /^(\d{1,4})-(\d{1,4})-(\d{1,3})(w?)$/;

export function parseCard(slug: string): GhostCard | null {
  const m = decodeURIComponent(slug).match(RE);
  if (!m) return null;
  const sent = Math.min(5000, Number(m[1]));
  const ghosted = Math.min(sent, Number(m[2]));
  const period = Math.min(m[4] ? 520 : 120, Number(m[3]));
  return { sent, ghosted, period, unit: m[4] ? "weeks" : "months" };
}

export function cardLines(c: GhostCard) {
  const share = c.sent ? Math.round((c.ghosted / c.sent) * 100) : 0;
  const span = c.period
    ? `${c.period} ${c.period === 1 ? c.unit.slice(0, -1) : c.unit}`
    : "";
  return {
    big: c.ghosted.toLocaleString("en-GB"),
    headline:
      c.ghosted === 0
        ? "Not ghosted once. Yet."
        : `Ghosted ${c.ghosted.toLocaleString("en-GB")} times`,
    sub: c.sent
      ? `${c.sent.toLocaleString("en-GB")} applications${span ? ` in ${span}` : ""}. ${share} in 100 never got a reply.`
      : "",
  };
}
