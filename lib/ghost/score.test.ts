import assert from "node:assert/strict";
import { test } from "node:test";

import { parseSalary } from "../jobs/normalize";
import { bandOf, pastedAgeDays, scoreGhost } from "./score";

const now = new Date("2026-11-10T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const body = "A real role with real details. ".repeat(40);

test("a fresh ad with a salary scores low", () => {
  const r = scoreGhost({
    now,
    postedAt: daysAgo(2),
    text: body,
    hasSalary: true,
    repostCount: 0,
  });
  assert.equal(r.band, "low");
  assert.equal(r.score, 0);
});

test("an old, reposted, unsalaried talent-pool ad scores high", () => {
  const r = scoreGhost({
    now,
    postedAt: daysAgo(120),
    text: `We are always looking for great people to join our talent pool. ${body}`,
    hasSalary: false,
    repostCount: 2,
  });
  assert.equal(r.band, "high");
  assert.ok(r.reasons.some((x) => x.key === "evergreen"));
  assert.ok(
    r.reasons[0].points >= (r.reasons.at(-1)?.points ?? 0),
    "reasons sorted by weight",
  );
});

test("member reply data only counts from five applications", () => {
  const few = scoreGhost({
    now,
    postedAt: daysAgo(2),
    text: body,
    hasSalary: true,
    repostCount: 0,
    memberReplies: { applied: 4, replied: 0 },
  });
  assert.ok(!few.reasons.some((x) => x.key === "member_ghosting"));
  const many = scoreGhost({
    now,
    postedAt: daysAgo(2),
    text: body,
    hasSalary: true,
    repostCount: 0,
    memberReplies: { applied: 20, replied: 1 },
  });
  assert.ok(many.reasons.some((x) => x.key === "member_ghosting"));
});

test("pasted LinkedIn text gives age and repost signals", () => {
  assert.equal(
    pastedAgeDays("London · Reposted 3 weeks ago · Over 100 applicants"),
    null,
  );
  assert.equal(pastedAgeDays("Posted 3 weeks ago"), 21);
  assert.equal(pastedAgeDays("Posted 30+ days ago"), 30);
  const r = scoreGhost({
    now,
    postedAt: null,
    text: "Reposted 2 weeks ago · Over 200 applicants",
    hasSalary: false,
    repostCount: 0,
    pasted: true,
  });
  assert.ok(r.reasons.some((x) => x.key === "repost"));
  assert.ok(r.reasons.some((x) => x.key === "crowded"));
});

test("bands cut at 30 and 60", () => {
  assert.equal(bandOf(29), "low");
  assert.equal(bandOf(30), "medium");
  assert.equal(bandOf(60), "high");
});

test("salaries parse to annual pounds", () => {
  assert.deepEqual(
    parseSalary("Salary: £45,000 - £55,000 plus equity")?.min,
    45000,
  );
  assert.equal(parseSalary("£60k–£70k")?.max, 70000);
  assert.equal(parseSalary("£450 per day")?.min, 450 * 220);
  assert.equal(parseSalary("We offer a £500 learning budget"), null);
});

test("careers-page boilerplate further down is not a talent-pool ad", () => {
  const r = scoreGhost({
    now,
    postedAt: daysAgo(1),
    text: `${body} We move fast and we are always looking for new ideas. Not the right role? Join our talent community.`,
    hasSalary: true,
    repostCount: 0,
  });
  assert.ok(!r.reasons.some((x) => x.key === "evergreen"));
});
