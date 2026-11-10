import type { Screen } from "./types";

/**
 * The quiz script, in order. Copy lives here, not in the component, so it can
 * change without touching code paths. {tokens} are filled from live data:
 * {liveRoles} {companies} {fresh24} {fresh7} {over30} {over30Per100}
 * {highRisk} {highRiskPer100} {staleOver60}.
 * Screens marked long are skipped in the short-quiz arm.
 */
export const SCREENS: Screen[] = [
  // 1. Your goal: open on the dream, not the pain.
  {
    id: "salary",
    kind: "slider",
    chapter: "Your goal",
    field: "salary",
    title: "What do you want to earn?",
    sub: "Drag to your target. The bars are real UK salaries in live ads today.",
  },
  {
    id: "work_type",
    kind: "single",
    chapter: "Your goal",
    field: "workType",
    title: "What kind of work?",
    options: [
      { value: "full_time", label: "Full-time", emoji: "💼" },
      { value: "contract", label: "Contract or fixed term", emoji: "📄" },
      { value: "part_time", label: "Part-time", emoji: "⏱️" },
      { value: "any", label: "Open to anything", emoji: "✨" },
    ],
  },
  {
    id: "start",
    kind: "single",
    chapter: "Your goal",
    field: "start",
    title: "When do you want to start?",
    options: [
      { value: "asap", label: "As soon as possible", emoji: "🔥" },
      { value: "month", label: "Within a month", emoji: "📅" },
      { value: "quarter", label: "In the next few months", emoji: "🗓️" },
      { value: "browsing", label: "Just seeing what's out there", emoji: "👀" },
    ],
  },
  {
    id: "fresh_card",
    kind: "interstitial",
    chapter: "Your goal",
    emoji: "⚡",
    title: "{fresh24} new roles went live in the last 24 hours",
    body: "Straight from {companies} companies' own careers pages, which we check every hour. Most people apply in a job's first few days, so new roles are where you get noticed.",
  },

  // 2. Where you're at: segments the user and sets up the Ghost Count.
  {
    id: "status",
    kind: "single",
    chapter: "Where you're at",
    field: "status",
    title: "Where are you right now?",
    options: [
      { value: "employed", label: "Working, but want out", emoji: "🚪" },
      { value: "out_of_work", label: "Between jobs", emoji: "🧭" },
      { value: "student", label: "Student or recent graduate", emoji: "🎓" },
      {
        value: "self_employed",
        label: "Freelance or self-employed",
        emoji: "🛠️",
      },
    ],
  },
  {
    id: "searching",
    kind: "single",
    chapter: "Where you're at",
    field: "searching",
    title: "How long have you been looking?",
    options: [
      { value: "just_started", label: "Just started", emoji: "🌱" },
      { value: "1_3", label: "1 to 3 months", emoji: "⏳" },
      { value: "3_6", label: "3 to 6 months", emoji: "😮‍💨" },
      { value: "6_plus", label: "Over 6 months", emoji: "🫠" },
    ],
  },
  {
    id: "sent",
    kind: "single",
    chapter: "Where you're at",
    field: "sent",
    title: "Roughly how many applications have you sent?",
    options: [
      { value: 5, label: "Under 10" },
      { value: 30, label: "10 to 50" },
      { value: 75, label: "50 to 100" },
      { value: 175, label: "100 to 250" },
      { value: 300, label: "Over 250" },
    ],
  },
  {
    id: "replies",
    kind: "single",
    chapter: "Where you're at",
    field: "replyShare",
    title: "How many of those got any reply at all?",
    sub: "Even a rejection counts as a reply.",
    options: [
      { value: 0.6, label: "Most of them" },
      { value: 0.35, label: "About a third" },
      { value: 0.15, label: "A few" },
      { value: 0.05, label: "Almost none" },
      { value: 0, label: "Not one" },
    ],
  },
  { id: "ghost_count", kind: "ghostcount", chapter: "Where you're at" },

  // 3. What you want.
  {
    id: "wants",
    kind: "multi",
    chapter: "What you want",
    field: "wants",
    title: "What matters most in your next role?",
    sub: "Pick as many as you like.",
    long: true,
    options: [
      { value: "salary_shown", label: "Salary shown upfront", emoji: "💷" },
      { value: "replies", label: "Actually hearing back", emoji: "📬" },
      { value: "growth", label: "Room to grow", emoji: "📈" },
      { value: "flexible", label: "Flexible hours", emoji: "🕊️" },
      { value: "mission", label: "Work that matters", emoji: "🌍" },
      { value: "brand", label: "A known company", emoji: "🏢" },
    ],
  },
  {
    id: "setting",
    kind: "single",
    chapter: "What you want",
    field: "setting",
    title: "Where do you want to work?",
    options: [
      { value: "hybrid", label: "Hybrid", emoji: "🔀" },
      { value: "remote", label: "Fully remote", emoji: "🏡" },
      { value: "office", label: "In the office", emoji: "🏙️" },
      { value: "any", label: "No preference", emoji: "🤷" },
    ],
  },
  {
    id: "halfway",
    kind: "interstitial",
    chapter: "What you want",
    emoji: "🎉",
    title: "Halfway there. Your profile is taking shape.",
    body: "A few more taps and we'll check every live role against it.",
  },

  // 4. Your background.
  {
    id: "level",
    kind: "single",
    chapter: "Your background",
    field: "level",
    title: "What level are you going for?",
    options: [
      { value: "entry", label: "Entry level or graduate" },
      { value: "mid", label: "Mid level" },
      { value: "senior", label: "Senior" },
      { value: "lead", label: "Lead or manager" },
      { value: "director", label: "Director or above" },
    ],
  },
  {
    id: "title",
    kind: "title",
    chapter: "Your background",
    title: "What job do you want next?",
    sub: "Tap one, or type your own.",
  },

  // 5. How we help: the user says the problem, then we answer it.
  {
    id: "pain_void",
    kind: "pain",
    chapter: "How we help",
    painKey: "void",
    quote: "I send applications and never hear a thing back.",
    yes: {
      title: "You're not imagining it.",
      body: "Over half of UK hiring managers say they'd stop replying to candidates. And most applications land in a job's first 4 days, so applying on day 10 puts you at the back of a pile that may already be closed.",
    },
    no: {
      title: "Good. Let's keep it that way.",
      body: "Applying early, straight to the company, keeps the odds on your side.",
    },
  },
  {
    id: "pain_crowd",
    kind: "pain",
    chapter: "How we help",
    painKey: "crowd",
    quote: "Every job I find already has hundreds of applicants.",
    long: true,
    yes: {
      title: "That's the queue you're joining.",
      body: "Big job boards show every role to everyone at once. We send you new roles the hour they go live on the company's own site, so you get in before the crowd.",
    },
    no: {
      title: "Nice. Let's keep you ahead.",
      body: "New roles reach you within the hour, straight from the company, with the real posting date on every one.",
    },
  },
  {
    id: "pain_recruiter",
    kind: "pain",
    chapter: "How we help",
    painKey: "recruiter",
    quote: "I get to the final round, then they just go silent.",
    long: true,
    yes: {
      title: "That's the worst kind of ghosting.",
      body: "Members log every application. When a company goes quiet, its reply rate drops for everyone, so you can see who answers before you apply.",
    },
    no: {
      title: "Here's how we keep it that way.",
      body: "Members log every application, so you can see which companies reply before you spend a weekend on a take-home task.",
    },
  },

  // 6. Final.
  {
    id: "city",
    kind: "city",
    chapter: "Final step",
    title: "Where are you based?",
    sub: "Only used to match roles. Never shown to employers.",
  },
];

export const CHAPTERS = [
  "Your goal",
  "Where you're at",
  "What you want",
  "Your background",
  "How we help",
  "Final step",
];

export function screensFor(quizArm: "long" | "short"): Screen[] {
  return quizArm === "short" ? SCREENS.filter((s) => !s.long) : SCREENS;
}

export function fillTokens(
  text: string,
  values: Record<string, string | number>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, k) =>
    k in values ? String(values[k]) : `{${k}}`,
  );
}
