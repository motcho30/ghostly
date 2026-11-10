import assert from "node:assert/strict";
import { test } from "node:test";

import { isPrivateAddress } from "./check/fetch";
import { assignArms } from "./experiments";
import { cardLines, parseCard } from "./ghost-card";
import { isUkLocation, ukPlaces } from "./jobs/normalize";
import { offerFor } from "./pricing";

const now = new Date("2026-11-10T12:00:00Z");
const base = {
  arms: { trial: "one_pound" as const },
  introActive: true,
  laterActive: false,
  referred: false,
  now,
};

test("weekly intro is £1 then £7, and the terms say both", () => {
  const o = offerFor("weekly", base);
  assert.equal(o.firstChargePence, 100);
  assert.equal(o.pricePence, 700);
  assert.match(
    o.terms,
    /^£1 today, then £7 every week from 17 Nov until you cancel\.$/,
  );
});

test("the intro ends when its hold has expired", () => {
  const o = offerFor("weekly", { ...base, introActive: false });
  assert.equal(o.firstChargePence, 700);
  assert.equal(o.introLabel, null);
});

test("a referred friend gets the first week free in either trial arm", () => {
  assert.equal(
    offerFor("weekly", { ...base, referred: true }).firstChargePence,
    0,
  );
  assert.equal(
    offerFor("weekly", {
      ...base,
      referred: true,
      arms: { trial: "free_week" },
    }).firstChargePence,
    0,
  );
});

test("the Maybe later offer takes 20% off every plan for good", () => {
  const later = { ...base, introActive: false, laterActive: true };
  assert.equal(offerFor("weekly", later).pricePence, 560);
  assert.equal(offerFor("monthly", later).pricePence, 1120);
  assert.equal(offerFor("lifetime", later).pricePence, 2400);
  assert.equal(offerFor("lifetime", later).terms, "£24 once. No renewals.");
});

test("share cards clamp numbers and never claim more ghosts than applications", () => {
  assert.deepEqual(parseCard("150-130-6"), {
    sent: 150,
    ghosted: 130,
    period: 6,
    unit: "months",
  });
  assert.equal(parseCard("10-99-3w")?.ghosted, 10);
  assert.equal(parseCard("<script>"), null);
  assert.equal(
    cardLines({ sent: 150, ghosted: 130, period: 6, unit: "months" }).sub,
    "150 applications in 6 months. 87 in 100 never got a reply.",
  );
});

test("UK filter keeps UK places and drops look-alikes abroad", () => {
  assert.equal(isUkLocation("London"), true);
  assert.equal(isUkLocation("Remote (UK)"), true);
  assert.equal(isUkLocation("New York; London"), true);
  assert.equal(isUkLocation("Cambridge, MA"), false);
  assert.equal(isUkLocation("Berlin, Germany"), false);
  assert.equal(isUkLocation("Anywhere", "US"), false);
  assert.equal(
    ukPlaces("Berlin Office; Remote - UK; Remote - UK"),
    "Remote - UK",
  );
});

test("A/B arms are stable per visitor and overrides must be real arms", () => {
  assert.deepEqual(assignArms("visitor-1"), assignArms("visitor-1"));
  assert.equal(
    assignArms("visitor-1", { trial: "free_week" }).trial,
    "free_week",
  );
  assert.notEqual(
    assignArms("visitor-1", { trial: "free_forever" }).trial,
    "free_forever",
  );
});

test("Ghost Check refuses internal addresses", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "fd00::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  assert.equal(isPrivateAddress("104.16.0.1"), false);
});

test("agencies and listed non-employers are kept out of every source", async () => {
  const { isExcludedEmployer } = await import("./ingest/excluded");
  assert.equal(isExcludedEmployer("Hays Recruitment"), true);
  assert.equal(isExcludedEmployer("Acme Staffing Ltd"), true);
  assert.equal(isExcludedEmployer("Jobs for Humanity"), true);
  assert.equal(isExcludedEmployer("Greene King"), false);
  assert.equal(isExcludedEmployer("Monzo"), false);
});
