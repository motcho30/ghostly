"use client";

import { Link2, Loader2, TextCursorInput } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { btn, cx, input } from "./ui";

export function CheckForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "text">("url");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const isUrl = mode === "url";
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isUrl ? { url: value.trim() } : { text: value }),
    });
    const json = (await res.json()) as {
      id?: string;
      error?: string;
      needText?: boolean;
    };
    if (json.id) {
      router.push(`/check/${json.id}`);
      return;
    }
    setError(json.error ?? "Something went wrong.");
    if (json.needText && isUrl) {
      setMode("text");
      setValue("");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="mb-3 inline-flex rounded-full border border-line bg-surface p-1 text-[13px]">
        {(
          [
            ["url", "Job link", Link2],
            ["text", "Paste the ad", TextCursorInput],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
              mode === m ? "bg-surface-2 text-text" : "text-muted",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      {mode === "url" ? (
        <input
          className={input}
          type="url"
          required
          placeholder="https://… a job on LinkedIn, Indeed or any careers page"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Job link"
        />
      ) : (
        <textarea
          className={cx(input, compact ? "min-h-28" : "min-h-44")}
          required
          placeholder="Paste the whole ad, including lines like 'Posted 3 weeks ago' or 'Reposted'"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Ad text"
        />
      )}
      {error && <p className="mt-2 text-[14px] text-amber">{error}</p>}
      <button
        type="submit"
        className={cx(btn.primary, "mt-3 w-full")}
        disabled={busy || !value.trim()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Is it worth
        applying?
      </button>
      <p className="mt-2 text-center text-[12px] text-faint">
        Free. No sign-up. Results get a public link you can share.
      </p>
    </form>
  );
}
