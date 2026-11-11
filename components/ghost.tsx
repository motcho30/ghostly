import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { cx } from "./ui";

export function GhostIcon({
  className,
  crossed = false,
}: {
  className?: string;
  crossed?: boolean;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 3C9.9 3 6 7.6 6 13.5V27c0 .9 1 1.3 1.6.7l2.2-2.1 2.3 2.2c.4.4 1 .4 1.4 0L16 25.6l2.5 2.2c.4.4 1 .4 1.4 0l2.3-2.2 2.2 2.1c.6.6 1.6.2 1.6-.7V13.5C26 7.6 22.1 3 16 3Z"
        fill="currentColor"
      />
      <ellipse cx="12.4" cy="14" rx="2" ry="2.6" fill="#ffffff" />
      <ellipse cx="19.6" cy="14" rx="2" ry="2.6" fill="#ffffff" />
      {crossed && (
        <path
          d="M4 28 28 4"
          stroke="#ff6b6b"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <GhostIcon className="h-6 w-6 text-text" crossed />
      <span className="text-[17px]">{BRAND.name}</span>
    </Link>
  );
}
