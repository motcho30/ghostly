import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the ghost mark on green. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f8a5f",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M16 3C9.9 3 6 7.6 6 13.5V27c0 .9 1 1.3 1.6.7l2.2-2.1 2.3 2.2c.4.4 1 .4 1.4 0L16 25.6l2.5 2.2c.4.4 1 .4 1.4 0l2.3-2.2 2.2 2.1c.6.6 1.6.2 1.6-.7V13.5C26 7.6 22.1 3 16 3Z"
          fill="#ffffff"
        />
        <ellipse cx="12.4" cy="14" rx="2" ry="2.6" fill="#0f8a5f" />
        <ellipse cx="19.6" cy="14" rx="2" ry="2.6" fill="#0f8a5f" />
      </svg>
    </div>,
    size,
  );
}
