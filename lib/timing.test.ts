import assert from "node:assert/strict";
import { test } from "node:test";

import { agoLabel, timingOf, verdictOf } from "./timing";

const now = new Date("2026-11-10T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

test("timing bands follow the 4 and 9 day windows", () => {
  assert.equal(timingOf(hoursAgo(3), now).key, "new");
  assert.equal(timingOf(hoursAgo(3), now).when, "Posted 3 hours ago");
  assert.equal(timingOf(hoursAgo(24 * 3), now).key, "early");
  assert.equal(timingOf(hoursAgo(24 * 8), now).key, "open");
  assert.equal(timingOf(hoursAgo(24 * 20), now).key, "late");
  assert.equal(timingOf(hoursAgo(24 * 45), now).key, "stale");
  assert.equal(timingOf(null, now).key, "unknown");
});

test("ago labels read naturally", () => {
  assert.equal(agoLabel(0.5), "under an hour ago");
  assert.equal(agoLabel(1), "1 hour ago");
  assert.equal(agoLabel(30), "1 day ago");
  assert.equal(agoLabel(24 * 21), "3 weeks ago");
});

test("verdicts: early means apply today, a month means probably too late", () => {
  assert.equal(
    verdictOf({ postedAt: hoursAgo(5), reasons: [], score: 0, now }).key,
    "apply_now",
  );
  assert.equal(
    verdictOf({ postedAt: hoursAgo(24 * 7), reasons: [], score: 10, now }).key,
    "apply_soon",
  );
  assert.equal(
    verdictOf({ postedAt: hoursAgo(24 * 20), reasons: [], score: 30, now }).key,
    "long_shot",
  );
  assert.equal(
    verdictOf({ postedAt: hoursAgo(24 * 50), reasons: [], score: 45, now }).key,
    "skip",
  );
});

test("a fresh talent-pool ad is still a skip", () => {
  const reasons = [
    { key: "evergreen", label: "Talent-pool wording", points: 25 },
    { key: "agency", label: "Recruiter", points: 15 },
    { key: "no_salary", label: "No salary", points: 10 },
  ];
  assert.equal(
    verdictOf({ postedAt: hoursAgo(2), reasons, score: 45, now }).key,
    "skip",
  );
});

test("no date: unclear unless the other signs are bad", () => {
  assert.equal(
    verdictOf({ postedAt: null, reasons: [], score: 20, now }).key,
    "unclear",
  );
  assert.equal(
    verdictOf({ postedAt: null, reasons: [], score: 70, now }).key,
    "skip",
  );
});
