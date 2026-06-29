// lib/apps/debt-escape/calc.test.ts
//
// Run with:  node --experimental-strip-types --test lib/apps/debt-escape/calc.test.ts
// (Node 22+). Pure math, no mocks needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  snowballSchedule,
  avalancheSchedule,
  compareStrategies,
  buildSchedule,
  type DebtInput,
} from "./calc.ts";

const approx = (a: number, b: number, eps = 0.05) =>
  Math.abs(a - b) <= eps;

test("zero-interest single debt pays off in balance/payment months", () => {
  const debts: DebtInput[] = [
    { id: "a", name: "Card", balance: 1000, apr: 0, minPayment: 100 },
  ];
  const s = snowballSchedule(debts, 0);
  assert.equal(s.months, 10);
  assert.ok(approx(s.totalInterest, 0), `interest ${s.totalInterest}`);
  assert.ok(approx(s.totalPaid, 1000), `paid ${s.totalPaid}`);
  assert.equal(s.feasible, true);
  assert.equal(s.perDebtPayoffOrder.length, 1);
  assert.equal(s.perDebtPayoffOrder[0].payoffMonth, 10);
});

test("interest accrues — paid exceeds principal when APR > 0", () => {
  const debts: DebtInput[] = [
    { id: "a", name: "Card", balance: 1000, apr: 24, minPayment: 100 },
  ];
  const s = snowballSchedule(debts, 0);
  assert.ok(s.totalInterest > 0, "should accrue interest");
  assert.ok(approx(s.totalPaid, 1000 + s.totalInterest), "paid = principal + interest");
});

test("snowball targets smallest balance, avalanche targets highest APR", () => {
  const debts: DebtInput[] = [
    { id: "big-highapr", name: "Big 30%", balance: 1000, apr: 30, minPayment: 25 },
    { id: "small-lowapr", name: "Small 10%", balance: 500, apr: 10, minPayment: 25 },
  ];
  const snow = snowballSchedule(debts, 100);
  const aval = avalancheSchedule(debts, 100);
  assert.equal(snow.perDebtPayoffOrder[0].debtId, "small-lowapr");
  assert.equal(aval.perDebtPayoffOrder[0].debtId, "big-highapr");
});

test("avalanche never pays more interest than snowball", () => {
  const debts: DebtInput[] = [
    { id: "a", name: "A", balance: 3000, apr: 27, minPayment: 60 },
    { id: "b", name: "B", balance: 1500, apr: 9, minPayment: 40 },
    { id: "c", name: "C", balance: 800, apr: 19, minPayment: 25 },
  ];
  const cmp = compareStrategies(debts, 150);
  assert.ok(
    cmp.avalanche.totalInterest <= cmp.snowball.totalInterest + 0.01,
    `aval ${cmp.avalanche.totalInterest} > snow ${cmp.snowball.totalInterest}`
  );
  assert.ok(cmp.interestSavedWithAvalanche >= -0.01);
  assert.equal(cmp.bestStrategy, "avalanche");
});

test("adding extra payment reduces months and interest", () => {
  const debts: DebtInput[] = [
    { id: "a", name: "A", balance: 5000, apr: 22, minPayment: 100 },
    { id: "b", name: "B", balance: 2000, apr: 15, minPayment: 50 },
  ];
  const none = avalancheSchedule(debts, 0);
  const extra = avalancheSchedule(debts, 300);
  assert.ok(extra.months < none.months, "extra should be faster");
  assert.ok(extra.totalInterest < none.totalInterest, "extra should cost less interest");
});

test("compareStrategies reports positive savings vs minimum-only baseline", () => {
  const debts: DebtInput[] = [
    { id: "a", name: "A", balance: 4000, apr: 25, minPayment: 80 },
    { id: "b", name: "B", balance: 2500, apr: 18, minPayment: 60 },
  ];
  const cmp = compareStrategies(debts, 200);
  assert.ok(
    cmp.interestSavedVsMinimumOnly > 0,
    `expected savings, got ${cmp.interestSavedVsMinimumOnly}`
  );
  assert.ok(cmp.monthsSavedVsMinimumOnly > 0);
});

test("non-amortizing debt is flagged infeasible, capped at MAX_MONTHS", () => {
  // 24% APR on $10k => ~$200/mo interest; $50 min, no extra never amortizes.
  const debts: DebtInput[] = [
    { id: "a", name: "Trap", balance: 10000, apr: 24, minPayment: 50 },
  ];
  const s = buildSchedule(debts, 0, "avalanche", { rollover: false });
  assert.equal(s.feasible, false);
});

test("rollover frees minimums forward — cleared debt accelerates the rest", () => {
  const debts: DebtInput[] = [
    { id: "small", name: "Small", balance: 300, apr: 0, minPayment: 50 },
    { id: "big", name: "Big", balance: 2000, apr: 0, minPayment: 50 },
  ];
  const withRoll = buildSchedule(debts, 0, "snowball", { rollover: true });
  const noRoll = buildSchedule(debts, 0, "snowball", { rollover: false });
  assert.ok(
    withRoll.months < noRoll.months,
    `rollover ${withRoll.months} should beat no-rollover ${noRoll.months}`
  );
});

test("multiple debts all reach payoff order entries", () => {
  const debts: DebtInput[] = [
    { id: "a", name: "A", balance: 1000, apr: 20, minPayment: 30 },
    { id: "b", name: "B", balance: 1500, apr: 15, minPayment: 40 },
    { id: "c", name: "C", balance: 500, apr: 25, minPayment: 20 },
  ];
  const s = avalancheSchedule(debts, 200);
  assert.equal(s.perDebtPayoffOrder.length, 3);
  // orders are 1,2,3 unique
  const orders = s.perDebtPayoffOrder.map((p) => p.order).sort();
  assert.deepEqual(orders, [1, 2, 3]);
  // last payoffMonth equals schedule length
  const lastMonth = Math.max(...s.perDebtPayoffOrder.map((p) => p.payoffMonth));
  assert.equal(lastMonth, s.months);
});
