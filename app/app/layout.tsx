import { Briefcase, ListChecks, User } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/ghost";

const tabs = [
  { href: "/app", label: "Live roles", icon: Briefcase },
  { href: "/app/tracker", label: "Tracker", icon: ListChecks },
  { href: "/app/account", label: "Account", icon: User },
];

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex min-h-dvh flex-col pb-20 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo href="/app" />
          <nav className="hidden gap-1 sm:flex">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-full px-3.5 py-2 text-[14px] text-muted hover:bg-surface hover:text-text"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-bg/95 backdrop-blur sm:hidden">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted"
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
