// lib/apps/salary-negotiation/comp.test.ts
// Run: node --experimental-strip-types --test lib/apps/salary-negotiation/comp.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupComp, offerGap, experienceFactor } from "./comp.ts";

test("matches role and metro from free text", () => {
  const c = lookupComp("Senior Software Engineer", "San Francisco, CA", 8);
  assert.equal(c.matchedRole, "Senior Software Engineer");
  assert.equal(c.matchedMetro, "San Francisco Bay Area");
  assert.ok(c.roleMatched && c.metroMatched);
  assert.ok(c.p25 < c.p50 && c.p50 < c.p75, "percentiles ordered");
});

test("longest keyword wins (senior beats plain software engineer)", () => {
  const senior = lookupComp("Senior Software Engineer", "Austin", 5);
  const mid = lookupComp("Software Engineer", "Austin", 5);
  assert.ok(senior.p50 > mid.p50, "senior should pay more");
});

test("high cost-of-labor metro pays more than national", () => {
  const sf = lookupComp("Product Manager", "San Francisco", 5);
  const nat = lookupComp("Product Manager", "Nowheresville", 5);
  assert.equal(nat.matchedMetro, "National average");
  assert.equal(nat.metroMatched, false);
  assert.ok(sf.p50 > nat.p50);
});

test("experience factor rises with years and is clamped", () => {
  assert.ok(experienceFactor(0) < experienceFactor(5));
  assert.ok(experienceFactor(5) < experienceFactor(15));
  assert.equal(experienceFactor(100), experienceFactor(40)); // clamped
  assert.ok(Math.abs(experienceFactor(5) - 1.0) < 0.001, "≈1.0 at 5 yrs");
});

test("unknown role falls back to generic baseline", () => {
  const c = lookupComp("Underwater Basket Weaver", "Chicago", 5);
  assert.equal(c.roleMatched, false);
  assert.equal(c.matchedRole, "Professional (general)");
});

test("offerGap flags below-market offers", () => {
  const c = lookupComp("Software Engineer", "Denver", 5);
  const low = offerGap(c.p50 - 20000, c);
  assert.ok(low.belowMarket);
  assert.ok(low.gapToMedian > 0);
  assert.ok(low.percentile < 50);

  const high = offerGap(c.p75 + 10000, c);
  assert.ok(!high.belowMarket);
  assert.ok(high.percentile >= 75);
});

test("percentile lands near 50 at the median", () => {
  const c = lookupComp("Data Scientist", "Seattle", 6);
  const g = offerGap(c.p50, c);
  assert.ok(Math.abs(g.percentile - 50) <= 2, `got ${g.percentile}`);
});
