import type { Level } from "@/lib/db/schema";

export type Setting = "remote" | "hybrid" | "office" | "any";

/** Everything the quiz collects. All optional until the user answers. */
export type Answers = {
  salary?: number;
  workType?: "full_time" | "part_time" | "contract" | "any";
  start?: "asap" | "month" | "quarter" | "browsing";
  status?: "out_of_work" | "employed" | "self_employed" | "student";
  searching?: "just_started" | "1_3" | "3_6" | "6_plus";
  sent?: number;
  replyShare?: number;
  wants?: string[];
  setting?: Setting;
  level?: Level;
  family?: string;
  titleText?: string;
  pains?: Record<string, boolean>;
  city?: string;
};

export type Option = {
  value: string | number;
  label: string;
  emoji?: string;
  hint?: string;
};

/** Values interstitials can show, all worked out from live data. */
export type QuizStats = {
  liveRoles: number;
  companies: number;
  fresh24: number;
  fresh7: number;
  over30: number;
  over30Per100: number;
  highRisk: number;
  highRiskPer100: number;
  staleOver60: number;
};

export type Screen =
  | {
      id: string;
      kind: "slider";
      chapter: string;
      field: "salary";
      title: string;
      sub?: string;
      long?: boolean;
    }
  | {
      id: string;
      kind: "single";
      chapter: string;
      field: keyof Answers;
      title: string;
      sub?: string;
      options: Option[];
      long?: boolean;
    }
  | {
      id: string;
      kind: "multi";
      chapter: string;
      field: "wants";
      title: string;
      sub?: string;
      options: Option[];
      long?: boolean;
    }
  | {
      id: string;
      kind: "title";
      chapter: string;
      title: string;
      sub?: string;
      long?: boolean;
    }
  | {
      id: string;
      kind: "city";
      chapter: string;
      title: string;
      sub?: string;
      long?: boolean;
    }
  | {
      id: string;
      kind: "pain";
      chapter: string;
      painKey: string;
      quote: string;
      yes: { title: string; body: string };
      no: { title: string; body: string };
      long?: boolean;
    }
  | {
      id: string;
      kind: "interstitial";
      chapter: string;
      emoji: string;
      title: string;
      body: string;
      cta?: string;
      long?: boolean;
    }
  | { id: string; kind: "ghostcount"; chapter: string; long?: boolean };
