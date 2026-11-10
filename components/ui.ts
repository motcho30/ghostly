export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-mint px-6 py-3.5 text-[15px] font-semibold text-bg shadow-[0_0_0_1px_#6cf7b0,0_8px_30px_-8px_#6cf7b088] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50",
  white:
    "inline-flex items-center justify-center gap-2 rounded-full bg-text px-6 py-3.5 text-[15px] font-semibold text-bg transition hover:bg-white active:scale-[0.98] disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-[14px] font-medium text-text transition hover:border-faint active:scale-[0.98] disabled:opacity-50",
  link: "text-muted underline-offset-4 hover:text-text hover:underline",
};

export const card = "rounded-2xl border border-line bg-surface";
export const input =
  "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-text placeholder:text-faint outline-none transition focus:border-mint";
