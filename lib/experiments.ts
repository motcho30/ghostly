/**
 * A/B arms, stable per visitor: the same anonymous id always lands in the same
 * arm. Every lead stores its arms, so the admin page can split results by arm.
 * Force an arm for testing with ?arm_<name>=<value> on /start.
 */
export const EXPERIMENTS = {
  /** First week at £1 (a card check) against a free first week. */
  trial: ["one_pound", "free_week"],
  /** One fully visible matching job on the result screen, or all blurred. */
  result: ["one_visible", "all_blurred"],
  /** Email required to see results, or a "Skip, just show me" link. */
  email: ["required", "skippable"],
  /** The full quiz or a shorter one without the optional screens. */
  quiz: ["long", "short"],
} as const;

export type ExperimentName = keyof typeof EXPERIMENTS;
export type Arms = { [K in ExperimentName]: (typeof EXPERIMENTS)[K][number] };

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignArms(
  anonId: string,
  overrides: Record<string, string | undefined> = {},
): Arms {
  const out = {} as Record<string, string>;
  for (const [name, values] of Object.entries(EXPERIMENTS)) {
    const forced = overrides[name];
    out[name] =
      forced && (values as readonly string[]).includes(forced)
        ? forced
        : values[fnv1a(`${anonId}:${name}`) % values.length];
  }
  return out as Arms;
}
