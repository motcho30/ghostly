import { BRAND } from "@/lib/brand";

/** Shared look for every share image: dark card, ghost mark, one huge number. */
export function OgFrame(p: {
  eyebrow: string;
  big: string;
  bigColor?: string;
  /** For words instead of a number. */
  bigSize?: number;
  headline: string;
  sub?: string;
  footer?: string;
  tall?: boolean;
}) {
  const scale = p.tall ? 1.6 : 1;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: p.tall ? 116 : 56,
        background: "linear-gradient(160deg, #15132a 0%, #0b0b12 60%)",
        color: "#f5f5fa",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16 * scale,
          fontSize: 30 * scale,
          fontWeight: 700,
        }}
      >
        <svg
          width={44 * scale}
          height={44 * scale}
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <path
            d="M16 3C9.9 3 6 7.6 6 13.5V27c0 .9 1 1.3 1.6.7l2.2-2.1 2.3 2.2c.4.4 1 .4 1.4 0L16 25.6l2.5 2.2c.4.4 1 .4 1.4 0l2.3-2.2 2.2 2.1c.6.6 1.6.2 1.6-.7V13.5C26 7.6 22.1 3 16 3Z"
            fill="#a99bff"
          />
          <ellipse cx="12.4" cy="14" rx="2" ry="2.6" fill="#0b0b12" />
          <ellipse cx="19.6" cy="14" rx="2" ry="2.6" fill="#0b0b12" />
        </svg>
        {BRAND.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: p.tall ? 45 : 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#a3a3bb",
          }}
        >
          {p.eyebrow}
        </div>
        <div
          style={{
            fontSize: p.bigSize ?? (p.tall ? 352 : 160),
            fontWeight: 800,
            lineHeight: 1,
            color: p.bigColor ?? "#f5f5fa",
            marginTop: 12,
          }}
        >
          {p.big}
        </div>
        <div
          style={{
            fontSize: p.tall ? 90 : 48,
            fontWeight: 700,
            marginTop: p.tall ? 26 : 8,
          }}
        >
          {p.headline}
        </div>
        {p.sub && (
          <div
            style={{
              fontSize: p.tall ? 48 : 28,
              color: "#a3a3bb",
              marginTop: p.tall ? 26 : 10,
              maxWidth: 1000,
            }}
          >
            {p.sub}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 26 * scale,
          color: "#6cf7b0",
        }}
      >
        <span>{p.footer ?? "What's your Ghost Count?"}</span>
        <span style={{ color: "#a3a3bb" }}>{BRAND.domain}</span>
      </div>
    </div>
  );
}
