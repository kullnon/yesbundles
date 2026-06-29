// lib/apps/debt-escape/calc.ts
//
// Pure, fully unit-testable debt-payoff math for the Debt Escape Simulator.
// No I/O, no Date, no DOM — everything in here is deterministic so the
// snowball/avalanche engine can be exercised in isolation.
//
// All money is handled internally in integer CENTS to avoid floating-point
// drift across hundreds of monthly iterations. Inputs/outputs are dollars.

export type Strategy = "snowball" | "avalanche";

export interface DebtInput {
  id: string;
  name: string;
  /** Current balance in dollars (e.g. 5000 or 5000.50). */
  balance: number;
  /** Annual percentage rate, e.g. 19.99 for 19.99%. */
  apr: number;
  /** Minimum monthly payment in dollars. */
  minPayment: number;
}

export interface PerDebtMonth {
  debtId: string;
  name: string;
  /** Dollars. */
  startBalance: number;
  interest: number;
  payment: number;
  endBalance: number;
}

export interface MonthRow {
  /** 1-based month index. */
  month: number;
  interest: number;
  payment: number;
  /** Total balance remaining across all debts at end of month (dollars). */
  endBalance: number;
  debts: PerDebtMonth[];
}

export interface PayoffOrderEntry {
  debtId: string;
  name: string;
  /** 1-based order in which this debt was cleared (1 = cleared first). */
  order: number;
  /** 1-based month index in which the debt hit $0. */
  payoffMonth: number;
}

export interface Schedule {
  strategy: Strategy;
  /** Months until every debt is cleared. */
  months: number;
  /** Total interest paid over the life of the plan (dollars). */
  totalInterest: number;
  /** Total of every payment made (principal + interest), in dollars. */
  totalPaid: number;
  perDebtPayoffOrder: PayoffOrderEntry[];
  monthlyBreakdown: MonthRow[];
  /**
   * False when the plan can't realistically pay everything off (e.g. minimum
   * payments don't even cover interest and there is no extra to make progress).
   * When false, `months` is capped at MAX_MONTHS and the schedule is truncated.
   */
  feasible: boolean;
}

/** Hard cap so a non-amortizing input can't loop forever. 50 years. */
export const MAX_MONTHS = 600;

const toCents = (dollars: number): number => Math.round(dollars * 100);
const toDollars = (cents: number): number => Math.round(cents) / 100;

interface WorkingDebt {
  id: string;
  name: string;
  balance: number; // cents
  monthlyRate: number; // decimal, e.g. 0.0166
  minPayment: number; // cents
  order: number; // original input order, used as a stable tiebreak
}

function ordering(debts: WorkingDebt[], strategy: Strategy): WorkingDebt[] {
  const active = debts.filter((d) => d.balance > 0);
  active.sort((a, b) => {
    if (strategy === "snowball") {
      // Smallest balance first; tiebreak by higher APR, then input order.
      if (a.balance !== b.balance) return a.balance - b.balance;
      if (b.monthlyRate !== a.monthlyRate) return b.monthlyRate - a.monthlyRate;
      return a.order - b.order;
    }
    // avalanche: highest APR first; tiebreak by smaller balance, then order.
    if (b.monthlyRate !== a.monthlyRate) return b.monthlyRate - a.monthlyRate;
    if (a.balance !== b.balance) return a.balance - b.balance;
    return a.order - b.order;
  });
  return active;
}

export interface ScheduleOptions {
  /**
   * When true (default), freed-up minimum payments from cleared debts roll
   * forward into the payoff budget — this is what makes snowball/avalanche
   * work. Set false to model a pure "minimum-only" baseline.
   */
  rollover?: boolean;
}

/**
 * Core monthly simulation shared by both strategies.
 *
 * Budget model: each month the borrower pays
 *   (sum of original minimum payments) + extraMonthly
 * holding that total constant. As debts clear, the freed minimums are
 * automatically redirected to the highest-priority remaining debt (rollover).
 */
export function buildSchedule(
  debtsInput: DebtInput[],
  extraMonthly: number,
  strategy: Strategy,
  options: ScheduleOptions = {}
): Schedule {
  const rollover = options.rollover ?? true;

  const debts: WorkingDebt[] = debtsInput
    .map((d, i) => ({
      id: d.id,
      name: d.name,
      balance: toCents(d.balance),
      monthlyRate: d.apr / 100 / 12,
      minPayment: toCents(d.minPayment),
      order: i,
    }))
    .filter((d) => d.balance > 0);

  const extraCents = Math.max(0, toCents(extraMonthly));
  const monthlyBreakdown: MonthRow[] = [];
  const payoffOrder: PayoffOrderEntry[] = [];

  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  let feasible = true;

  const remaining = () => debts.filter((d) => d.balance > 0);

  while (remaining().length > 0) {
    month += 1;
    if (month > MAX_MONTHS) {
      feasible = false;
      month = MAX_MONTHS;
      break;
    }

    const monthDetail = new Map<
      string,
      { startBalance: number; interest: number; payment: number }
    >();

    // 1. Accrue interest on every active debt.
    let monthInterest = 0;
    for (const d of debts) {
      if (d.balance <= 0) continue;
      const interest = Math.round(d.balance * d.monthlyRate);
      d.balance += interest;
      monthInterest += interest;
      monthDetail.set(d.id, {
        startBalance: d.balance - interest,
        interest,
        payment: 0,
      });
    }

    // 2. Budget = sum of minimums of all debts that started active this month
    //    plus the extra. With rollover, freed minimums stay in the pool because
    //    the budget total is held constant.
    const activeThisMonth = remaining();
    const minimumsBudget = rollover
      ? debts.reduce((sum, d) => sum + d.minPayment, 0)
      : activeThisMonth.reduce((sum, d) => sum + d.minPayment, 0);
    let budget = minimumsBudget + extraCents;

    // 3. Pay each active debt at least its minimum (capped at what's owed).
    for (const d of activeThisMonth) {
      const pay = Math.min(d.minPayment, d.balance, budget);
      if (pay <= 0) continue;
      d.balance -= pay;
      budget -= pay;
      const md = monthDetail.get(d.id)!;
      md.payment += pay;
    }

    // 4. Funnel all leftover budget into debts by strategy priority.
    if (budget > 0) {
      for (const d of ordering(remaining(), strategy)) {
        if (budget <= 0) break;
        const pay = Math.min(d.balance, budget);
        if (pay <= 0) continue;
        d.balance -= pay;
        budget -= pay;
        const md = monthDetail.get(d.id)!;
        md.payment += pay;
      }
    }

    // 5. Detect non-amortizing stall: nothing got paid down this month.
    let monthPayment = 0;
    for (const md of monthDetail.values()) monthPayment += md.payment;
    if (monthPayment <= monthInterest && remaining().length > 0) {
      // We're only servicing (or not even covering) interest — never finishes.
      feasible = false;
      // Record this month then stop.
    }

    totalInterest += monthInterest;
    totalPaid += monthPayment;

    // 6. Record payoff order for any debt cleared this month.
    for (const d of activeThisMonth) {
      if (d.balance <= 0 && !payoffOrder.some((p) => p.debtId === d.id)) {
        payoffOrder.push({
          debtId: d.id,
          name: d.name,
          order: payoffOrder.length + 1,
          payoffMonth: month,
        });
      }
    }

    // 7. Emit the month row.
    const debtRows: PerDebtMonth[] = debts.map((d) => {
      const md = monthDetail.get(d.id);
      const startBalance = md ? md.startBalance : 0;
      const interest = md ? md.interest : 0;
      const payment = md ? md.payment : 0;
      return {
        debtId: d.id,
        name: d.name,
        startBalance: toDollars(startBalance),
        interest: toDollars(interest),
        payment: toDollars(payment),
        endBalance: toDollars(Math.max(0, d.balance)),
      };
    });

    monthlyBreakdown.push({
      month,
      interest: toDollars(monthInterest),
      payment: toDollars(monthPayment),
      endBalance: toDollars(
        debts.reduce((sum, d) => sum + Math.max(0, d.balance), 0)
      ),
      debts: debtRows,
    });

    if (!feasible) break;
  }

  return {
    strategy,
    months: month,
    totalInterest: toDollars(totalInterest),
    totalPaid: toDollars(totalPaid),
    perDebtPayoffOrder: payoffOrder,
    monthlyBreakdown,
    feasible,
  };
}

export function snowballSchedule(
  debts: DebtInput[],
  extraMonthly: number,
  options?: ScheduleOptions
): Schedule {
  return buildSchedule(debts, extraMonthly, "snowball", options);
}

export function avalancheSchedule(
  debts: DebtInput[],
  extraMonthly: number,
  options?: ScheduleOptions
): Schedule {
  return buildSchedule(debts, extraMonthly, "avalanche", options);
}

export interface Comparison {
  snowball: Schedule;
  avalanche: Schedule;
  /** Positive when avalanche pays less interest than snowball (dollars). */
  interestSavedWithAvalanche: number;
  /** Months avalanche is faster than snowball (can be 0 or negative). */
  monthsSavedWithAvalanche: number;
  /** The strategy with the lower total interest. */
  bestStrategy: Strategy;
  /**
   * Interest the borrower avoids by adding `extraMonthly`, versus paying only
   * the minimums with no rollover — measured on the better strategy.
   */
  interestSavedVsMinimumOnly: number;
  monthsSavedVsMinimumOnly: number;
}

export function compareStrategies(
  debts: DebtInput[],
  extraMonthly: number
): Comparison {
  const snowball = snowballSchedule(debts, extraMonthly);
  const avalanche = avalancheSchedule(debts, extraMonthly);

  const interestSavedWithAvalanche =
    Math.round((snowball.totalInterest - avalanche.totalInterest) * 100) / 100;
  const monthsSavedWithAvalanche = snowball.months - avalanche.months;

  const bestStrategy: Strategy =
    avalanche.totalInterest <= snowball.totalInterest ? "avalanche" : "snowball";
  const best = bestStrategy === "avalanche" ? avalanche : snowball;

  // True minimum-only baseline: no extra, no rollover of freed minimums.
  const baseline = buildSchedule(debts, 0, bestStrategy, { rollover: false });
  const interestSavedVsMinimumOnly =
    Math.round((baseline.totalInterest - best.totalInterest) * 100) / 100;
  const monthsSavedVsMinimumOnly = baseline.months - best.months;

  return {
    snowball,
    avalanche,
    interestSavedWithAvalanche,
    monthsSavedWithAvalanche,
    bestStrategy,
    interestSavedVsMinimumOnly,
    monthsSavedVsMinimumOnly,
  };
}
