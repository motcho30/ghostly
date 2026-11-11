"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Arms } from "@/lib/experiments";
import type { JobCardData } from "@/lib/match";
import { CHAPTERS, fillTokens } from "@/lib/quiz/config";
import type { Answers, Option, QuizStats, Screen } from "@/lib/quiz/types";
import { track } from "@/lib/track-client";
import { GhostIcon } from "./ghost";
import { JobCard } from "./job-card";
import { btn, card, cx, input } from "./ui";

type Chip = { id: string; label: string; n: number };
type Result = {
  leadId: string;
  count: number;
  broader: number;
  fresh48: number;
  titleLabel: string;
  visible: JobCardData[];
  locked: JobCardData[];
};
type Phase = "quiz" | "matching" | "result" | "name" | "email";

const STORE = "gl_quiz_v1";
export type MarketView = {
  histogram: number[];
  cities: string[];
  defaultCity: string;
  scale: { min: number; max: number; step: number; start: number; sym: string };
};
const fmt = (n: number) => n.toLocaleString("en-GB");

function encode(a: Answers) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(a))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// JSON dates arrive as strings; JobCard formats either.
const reviveJob = (j: JobCardData) => ({
  ...j,
  postedAt: j.postedAt ? new Date(j.postedAt) : null,
  firstSeenAt: new Date(j.firstSeenAt),
});

export function Quiz(props: {
  screens: Screen[];
  arms: Arms;
  stats: QuizStats;
  markets: Record<"GB" | "US", MarketView>;
  defaultCountry: "GB" | "US";
  chips: Chip[];
}) {
  const { screens, arms, stats } = props;
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({
    country: props.defaultCountry,
    salary: props.markets[props.defaultCountry].scale.start,
    city: props.markets[props.defaultCountry].defaultCity,
  });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [painShown, setPainShown] = useState<boolean | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const loaded = useRef(false);

  const tokens = useMemo(
    () =>
      Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, fmt(v)])),
    [stats],
  );
  const screen = screens[index];

  // Resume a half-finished quiz.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as {
        answers: Answers;
        index: number;
      } | null;
      if (saved && saved.index > 0 && saved.index < screens.length) {
        setAnswers(saved.answers);
        setIndex(saved.index);
      }
    } catch {
      // Storage can be blocked; start fresh.
    }
    loaded.current = true;
    track("quiz_start", { arms });
  }, [arms, screens.length]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ answers, index }));
    } catch {
      // Ignore.
    }
  }, [answers, index]);

  useEffect(() => {
    if (phase === "quiz" && screen)
      track("screen_view", { id: screen.id, index });
  }, [phase, screen, index]);

  // The live counter: real filtering on every answer.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/match?a=${encode(answers)}`);
        if (res.ok) setCount(((await res.json()) as { count: number }).count);
      } catch {
        // Keep the last number.
      }
    }, 220);
    return () => clearTimeout(t);
  }, [answers]);

  const next = useCallback(() => {
    setPainShown(null);
    if (index + 1 < screens.length) setIndex((i) => i + 1);
    else setPhase("matching");
  }, [index, screens.length]);

  const back = () => {
    if (phase !== "quiz")
      return setPhase(
        phase === "email" ? "name" : phase === "name" ? "result" : "quiz",
      );
    if (painShown !== null) return setPainShown(null);
    if (index > 0) setIndex((i) => i - 1);
    else router.push("/");
  };

  const set = (patch: Partial<Answers>, advance = false) => {
    setAnswers((a) => {
      const next = { ...a, ...patch };
      // A new country means its own currency and cities.
      if (patch.country && patch.country !== a.country) {
        const m = props.markets[patch.country];
        next.salary = m.scale.start;
        next.city = m.defaultCity;
      }
      return next;
    });
    if (screen) track("answer", { id: screen.id });
    if (advance) setTimeout(next, 180);
  };

  const chapterIdx = screen
    ? CHAPTERS.indexOf(screen.chapter)
    : CHAPTERS.length - 1;
  // Front-loaded progress: the first taps move the bar most.
  const progress =
    phase === "quiz"
      ? Math.min(
          96,
          Math.round(100 * Math.sqrt((index + 1) / (screens.length + 1))),
        )
      : 100;

  return (
    <main className="glow flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-4 pb-8">
        <header className="sticky top-0 z-10 -mx-4 bg-bg/85 px-4 pt-4 pb-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              className="-ml-2 rounded-full p-2 text-muted hover:text-text"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-[13px] font-medium text-muted">
              {phase === "quiz" ? screen?.chapter : "Your matches"}
            </span>
            <span
              className="inline-flex min-w-[88px] items-center justify-end gap-1.5 text-[12px] text-muted"
              aria-live="polite"
            >
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
              {count == null ? "…" : fmt(count)} live
            </span>
          </div>
          <div className="mt-3 flex gap-1">
            {CHAPTERS.map((c, i) => (
              <div
                key={c}
                className="h-1 flex-1 overflow-hidden rounded-full bg-line"
              >
                <div
                  className="h-full rounded-full bg-mint transition-all duration-500"
                  style={{
                    width:
                      phase !== "quiz" || i < chapterIdx
                        ? "100%"
                        : i === chapterIdx
                          ? `${Math.max(12, progress)}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>
        </header>

        <div
          key={`${phase}-${index}-${painShown}`}
          className="rise flex flex-1 flex-col pt-6"
        >
          {phase === "quiz" && screen && (
            <ScreenView
              screen={screen}
              answers={answers}
              tokens={tokens}
              set={set}
              next={next}
              painShown={painShown}
              setPainShown={setPainShown}
              market={props.markets[answers.country ?? props.defaultCountry]}
              chips={props.chips}
              count={count}
            />
          )}
          {phase === "matching" && (
            <Matching
              stats={stats}
              answers={answers}
              arms={arms}
              onDone={(r) => {
                setResult(r);
                setPhase("result");
                track("result_view", { count: r.count });
              }}
            />
          )}
          {phase === "result" && result && (
            <ResultView
              result={result}
              answers={answers}
              arms={arms}
              onContinue={() => setPhase("name")}
            />
          )}
          {phase === "name" && (
            <NameStep
              onDone={async (name) => {
                if (name)
                  await fetch("/api/lead", {
                    method: "PATCH",
                    body: JSON.stringify({ name }),
                    headers: { "content-type": "application/json" },
                  });
                setAnswers((a) => ({ ...a }));
                setPhase("email");
              }}
            />
          )}
          {phase === "email" && (
            <EmailStep
              skippable={arms.email === "skippable"}
              onDone={() => {
                try {
                  localStorage.removeItem(STORE);
                } catch {
                  // Ignore.
                }
                router.push("/plan");
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
        {children}
      </h1>
      {sub && <p className="mt-2 text-[15px] text-muted">{sub}</p>}
    </div>
  );
}

function OptionButton({
  option,
  selected,
  onClick,
}: {
  option: Option;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-[16px] font-medium transition active:scale-[0.99]",
        selected
          ? "border-mint bg-mint/10 text-text"
          : "border-line bg-surface hover:border-faint",
      )}
    >
      {option.emoji && <span className="text-[20px]">{option.emoji}</span>}
      <span className="flex-1">{option.label}</span>
      {selected && <Check className="h-5 w-5 text-mint" />}
    </button>
  );
}

function ScreenView(p: {
  screen: Screen;
  answers: Answers;
  tokens: Record<string, string>;
  set: (patch: Partial<Answers>, advance?: boolean) => void;
  next: () => void;
  painShown: boolean | null;
  setPainShown: (v: boolean) => void;
  market: MarketView;
  chips: Chip[];
  count: number | null;
}) {
  const { screen: s, answers, set, next, tokens } = p;
  const fill = (t: string) => fillTokens(t, tokens);

  if (s.kind === "slider") {
    const sc = p.market.scale;
    const v = answers.salary ?? sc.start;
    const max = Math.max(1, ...p.market.histogram);
    return (
      <>
        <Title sub={s.sub}>{s.title}</Title>
        <div className={cx(card, "p-5")}>
          <div className="text-center">
            <div className="font-mono text-[40px] font-semibold tabular-nums">
              {sc.sym}
              {fmt(v)}
            </div>
            <div className="text-[13px] text-muted">a year</div>
          </div>
          <div
            className="mt-6 flex h-24 items-end gap-[3px]"
            aria-hidden="true"
          >
            {p.market.histogram.map((n, i) => {
              const lo = sc.min + i * sc.step;
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed buckets
                  key={i}
                  className={cx(
                    "flex-1 rounded-t-sm transition-colors",
                    lo + sc.step > v ? "bg-mint/70" : "bg-line",
                  )}
                  style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={sc.min}
            max={sc.max}
            step={1000}
            value={v}
            onChange={(e) => set({ salary: Number(e.target.value) })}
            className="mt-3 w-full"
            aria-label="Target salary"
          />
          <div className="flex justify-between text-[12px] text-faint">
            <span>
              {sc.sym}
              {sc.min / 1000}k
            </span>
            <span>
              {sc.sym}
              {sc.max / 1000}k+
            </span>
          </div>
        </div>
        <button
          type="button"
          className={cx(btn.primary, "mt-auto w-full")}
          onClick={next}
        >
          Continue
        </button>
      </>
    );
  }

  if (s.kind === "single") {
    return (
      <>
        <Title sub={s.sub}>{s.title}</Title>
        <div className="flex flex-col gap-2.5">
          {s.options.map((o) => (
            <OptionButton
              key={String(o.value)}
              option={o}
              selected={answers[s.field] === o.value}
              onClick={() =>
                set({ [s.field]: o.value } as Partial<Answers>, true)
              }
            />
          ))}
        </div>
      </>
    );
  }

  if (s.kind === "multi") {
    const picked = answers.wants ?? [];
    return (
      <>
        <Title sub={s.sub}>{s.title}</Title>
        <div className="flex flex-col gap-2.5">
          {s.options.map((o) => {
            const on = picked.includes(String(o.value));
            return (
              <OptionButton
                key={String(o.value)}
                option={o}
                selected={on}
                onClick={() =>
                  set({
                    wants: on
                      ? picked.filter((x) => x !== o.value)
                      : [...picked, String(o.value)],
                  })
                }
              />
            );
          })}
        </div>
        <button
          type="button"
          className={cx(btn.primary, "mt-6 w-full")}
          onClick={next}
          disabled={!picked.length}
        >
          Continue
        </button>
      </>
    );
  }

  if (s.kind === "title")
    return <TitleStep {...p} title={s.title} sub={s.sub} />;
  if (s.kind === "city")
    return (
      <CityStep {...p} cities={p.market.cities} title={s.title} sub={s.sub} />
    );

  if (s.kind === "interstitial") {
    return (
      <div className="flex flex-1 flex-col">
        <div className={cx(card, "mt-6 p-7 text-center")}>
          <div className="text-[52px]">{s.emoji}</div>
          <h2 className="mt-3 text-[24px] font-semibold leading-tight">
            {fill(s.title)}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            {fill(s.body)}
          </p>
        </div>
        <button
          type="button"
          className={cx(btn.primary, "mt-auto w-full")}
          onClick={next}
        >
          {s.cta ?? "Continue"}
        </button>
      </div>
    );
  }

  if (s.kind === "ghostcount") {
    const sent = answers.sent ?? 0;
    const ghosted = Math.round(sent * (1 - (answers.replyShare ?? 0)));
    return (
      <div className="flex flex-1 flex-col">
        <div className={cx(card, "mt-4 overflow-hidden p-7 text-center")}>
          <GhostIcon className="float mx-auto h-16 w-16 text-violet" />
          <p className="mt-4 text-[14px] uppercase tracking-[0.14em] text-muted">
            Your Ghost Count
          </p>
          <div className="font-mono text-[72px] font-semibold leading-none tabular-nums text-text">
            {fmt(ghosted)}
          </div>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            {ghosted === 0
              ? "Nobody has ghosted you yet. Let's keep it that way."
              : `That's about ${fmt(ghosted)} applications that never got a reply. Not even a no. Most of that isn't about you.`}
          </p>
        </div>
        <p className="mt-4 text-center text-[13px] text-faint">
          You can share your Ghost Count at the end.
        </p>
        <button
          type="button"
          className={cx(btn.primary, "mt-auto w-full")}
          onClick={next}
        >
          Let's fix that
        </button>
      </div>
    );
  }

  if (s.kind === "pain") {
    const shown = p.painShown;
    if (shown !== null) {
      const copy = shown ? s.yes : s.no;
      return (
        <div className="flex flex-1 flex-col">
          <div className={cx(card, "mt-6 p-7")}>
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-mint">
              {shown ? "You said yes" : "Noted"}
            </p>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight">
              {fill(copy.title)}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {fill(copy.body)}
            </p>
          </div>
          <button
            type="button"
            className={cx(btn.primary, "mt-auto w-full")}
            onClick={next}
          >
            Continue
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col">
        <Title sub="Does this sound like you?">Be honest</Title>
        <blockquote
          className={cx(card, "p-7 font-serif text-[28px] italic leading-snug")}
        >
          “{s.quote}”
        </blockquote>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
          <button
            type="button"
            className={btn.ghost}
            onClick={() => {
              set({ pains: { ...answers.pains, [s.painKey]: false } });
              p.setPainShown(false);
            }}
          >
            No
          </button>
          <button
            type="button"
            className={cx(btn.ghost, "border-mint text-mint")}
            onClick={() => {
              set({ pains: { ...answers.pains, [s.painKey]: true } });
              p.setPainShown(true);
            }}
          >
            Yes, that's me
          </button>
        </div>
      </div>
    );
  }
  return null;
}

function TitleStep(p: {
  answers: Answers;
  set: (patch: Partial<Answers>, advance?: boolean) => void;
  next: () => void;
  chips: Chip[];
  title: string;
  sub?: string;
}) {
  const [text, setText] = useState(p.answers.titleText ?? "");
  return (
    <>
      <Title sub={p.sub}>{p.title}</Title>
      <input
        className={input}
        placeholder="e.g. Product Designer"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          p.set({ titleText: e.target.value, family: undefined });
        }}
        aria-label="Job title"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {p.chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setText(c.label);
              p.set({ family: c.id, titleText: c.label }, true);
            }}
            className={cx(
              "rounded-full border px-3.5 py-2 text-[14px] transition",
              p.answers.family === c.id
                ? "border-mint bg-mint/10 text-text"
                : "border-line bg-surface text-muted hover:text-text",
            )}
          >
            {c.label} <span className="text-faint">{fmt(c.n)}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={cx(btn.primary, "mt-auto w-full")}
        onClick={p.next}
        disabled={!text.trim()}
      >
        Continue
      </button>
    </>
  );
}

function CityStep(p: {
  answers: Answers;
  set: (patch: Partial<Answers>, advance?: boolean) => void;
  next: () => void;
  cities: string[];
  title: string;
  sub?: string;
}) {
  return (
    <>
      <Title sub={p.sub}>{p.title}</Title>
      <input
        className={input}
        value={p.answers.city ?? ""}
        onChange={(e) => p.set({ city: e.target.value })}
        aria-label="City"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {p.cities.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => p.set({ city: c })}
            className={cx(
              "rounded-full border px-3.5 py-2 text-[14px] transition",
              p.answers.city === c
                ? "border-mint bg-mint/10 text-text"
                : "border-line bg-surface text-muted hover:text-text",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-faint">
        🔒 Never shown to employers.
      </p>
      <button
        type="button"
        className={cx(btn.primary, "mt-auto w-full")}
        onClick={p.next}
        disabled={!p.answers.city?.trim()}
      >
        Find my live roles
      </button>
    </>
  );
}

function Matching({
  stats,
  answers,
  arms,
  onDone,
}: {
  stats: QuizStats;
  answers: Answers;
  arms: Arms;
  onDone: (r: Result) => void;
}) {
  const steps = [
    `Reading ${fmt(stats.companies)} company careers pages`,
    `Sorting ${fmt(stats.liveRoles)} live roles by when they went live`,
    `Setting aside ${fmt(stats.highRisk)} stale or suspect ads`,
    "Putting the newest matches first",
  ];
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once when the matching screen opens
  useEffect(() => {
    let cancelled = false;
    const timers = steps.map((_, i) =>
      setTimeout(() => !cancelled && setDone(i + 1), 850 * (i + 1)),
    );
    const request = fetch("/api/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers, arms }),
    }).then(async (r) => {
      if (!r.ok) throw new Error("Something went wrong. Try again.");
      return (await r.json()) as Result;
    });
    const minWait = new Promise((r) => setTimeout(r, 850 * steps.length + 300));
    Promise.all([request, minWait])
      .then(
        ([r]) =>
          !cancelled &&
          onDone({
            ...r,
            visible: r.visible.map(reviveJob),
            locked: r.locked.map(reviveJob),
          }),
      )
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, []);
  return (
    <div className="flex flex-1 flex-col items-center pt-10">
      <GhostIcon className="float h-16 w-16 text-violet" crossed />
      <h1 className="mt-6 text-center text-[24px] font-semibold">
        Finding your live roles
      </h1>
      <ul className="mt-8 w-full space-y-3">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cx(
              card,
              "flex items-center gap-3 px-4 py-3.5 text-[15px] transition",
              i < done ? "text-text" : "text-faint",
            )}
          >
            {i < done ? (
              <Check className="h-5 w-5 text-mint" />
            ) : i === done ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            ) : (
              <span className="h-5 w-5" />
            )}
            {s}
          </li>
        ))}
      </ul>
      {error && <p className="mt-6 text-coral">{error}</p>}
    </div>
  );
}

function ResultView({
  result,
  answers,
  arms,
  onContinue,
}: {
  result: Result;
  answers: Answers;
  arms: Arms;
  onContinue: () => void;
}) {
  const sent = answers.sent ?? 0;
  const ghosted = Math.round(sent * (1 - (answers.replyShare ?? 0)));
  const months = { just_started: 0, "1_3": 2, "3_6": 4, "6_plus": 8 }[
    answers.searching ?? "just_started"
  ];
  const place =
    answers.setting === "remote" || answers.city?.startsWith("Remote")
      ? `remote across ${answers.country === "US" ? "the US" : "the UK"}`
      : `in or near ${answers.city}`;
  const empty = result.count === 0;
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-[13px] font-medium uppercase tracking-[0.14em] text-mint">
        Matched just now
      </p>
      {empty ? (
        <h1 className="mt-2 text-center text-[26px] font-semibold leading-tight">
          No exact live matches today. {fmt(result.broader)} close ones if you
          widen the search.
        </h1>
      ) : (
        <h1 className="mt-2 text-center text-[30px] font-semibold leading-tight">
          <span className="font-mono text-[56px] text-mint tabular-nums">
            {fmt(result.count)}
          </span>
          <br />
          live {result.titleLabel} roles {place}
        </h1>
      )}
      <p className="mt-3 text-center text-[14px] text-muted">
        {empty
          ? "New roles go live every day. We'll email you the moment one fits."
          : `Straight from company careers pages, newest first. ${result.fresh48 ? `${fmt(result.fresh48)} went live in the last 48 hours: you'd be early.` : ""}`}
      </p>

      <div className="mt-6 space-y-3">
        {result.visible.map((j) => (
          <div key={j.id}>
            <JobCard job={j} />
            <p className="mt-1.5 text-center text-[12px] text-faint">
              Your top match, free. The apply link unlocks with a plan.
            </p>
          </div>
        ))}
        {result.locked.map((j, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: redacted cards have no id
          <JobCard key={`locked-${i}`} job={j} blurred />
        ))}
      </div>

      {sent > 0 && (
        <div className={cx(card, "mt-6 flex items-center gap-4 p-4")}>
          <GhostIcon className="h-10 w-10 shrink-0 text-violet" />
          <div className="flex-1">
            <p className="text-[14px] font-medium">
              Ghosted {fmt(ghosted)} times?
            </p>
            <p className="text-[13px] text-muted">
              Make a card of your Ghost Count and see your friends' numbers.
            </p>
          </div>
          <a
            href={`/ghosted/${sent}-${ghosted}-${months}`}
            target="_blank"
            rel="noopener"
            className={cx(btn.ghost, "px-4 py-2 text-[13px]")}
            onClick={() => track("ghostcard_open", { from: "result" })}
          >
            Share
          </a>
        </div>
      )}

      <button
        type="button"
        className={cx(btn.primary, "mt-6 w-full")}
        onClick={onContinue}
      >
        {empty
          ? "Alert me when one goes live"
          : `Show my ${fmt(result.count)} matches`}
      </button>
      {arms.result === "all_blurred" && (
        <p className="mt-2 text-center text-[12px] text-faint">
          All matches unlock together.
        </p>
      )}
    </div>
  );
}

function NameStep({ onDone }: { onDone: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onDone(name.trim());
      }}
    >
      <Title sub="So we know what to call you.">What's your first name?</Title>
      <input
        className={input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="given-name"
        placeholder="First name"
        aria-label="First name"
      />
      <button
        type="submit"
        className={cx(btn.primary, "mt-auto w-full")}
        disabled={!name.trim() || busy}
      >
        Continue
      </button>
    </form>
  );
}

function EmailStep({
  skippable,
  onDone,
}: {
  skippable: boolean;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await fetch("/api/lead", {
          method: "PATCH",
          body: JSON.stringify({ email: email.trim() }),
          headers: { "content-type": "application/json" },
        });
        if (!r.ok) {
          setError(((await r.json()) as { error: string }).error);
          setBusy(false);
          return;
        }
        onDone();
      }}
    >
      <Title>Where should we send your matches?</Title>
      <input
        className={input}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="you@email.com"
        aria-label="Email"
      />
      <p className="mt-2 text-[13px] text-faint">
        No spam · Unsubscribe any time · Never shared with employers
      </p>
      {error && <p className="mt-2 text-[14px] text-coral">{error}</p>}
      <div className="mt-auto">
        <button
          type="submit"
          className={cx(btn.primary, "w-full")}
          disabled={!email.includes("@") || busy}
        >
          Show my matches
        </button>
        {skippable && (
          <button
            type="button"
            className={cx(btn.link, "mt-3 w-full text-center text-[14px]")}
            onClick={() => {
              track("email_skip");
              onDone();
            }}
          >
            Skip, just show me
          </button>
        )}
      </div>
    </form>
  );
}
