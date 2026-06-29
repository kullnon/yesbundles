"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Lock,
  Download,
  TrendingDown,
  Scale,
  Sparkles,
  ArrowRight,
  CircleCheck,
  Calendar,
} from "lucide-react";
import {
  compareStrategies,
  type DebtInput,
  type Schedule,
  type Strategy,
} from "@/lib/apps/debt-escape/calc";
import { APP_ROUTE, APP_PRICE_CENTS } from "@/lib/apps/debt-escape/config";

// ── editable row: keep numeric fields as strings so inputs stay controlled ──
interface DebtRow {
  id: string;
  name: string;
  balance: string;
  apr: string;
  minPayment: string;
}

let rowSeq = 0;
const newRow = (over: Partial<DebtRow> = {}): DebtRow => ({
  id: `d${rowSeq++}`,
  name: "",
  balance: "",
  apr: "",
  minPayment: "",
  ...over,
});

const DEFAULT_ROWS: DebtRow[] = [
  newRow({ name: "Visa", balance: "6200", apr: "22.9", minPayment: "140" }),
  newRow({ name: "Car loan", balance: "11800", apr: "7.5", minPayment: "320" }),
  newRow({ name: "Store card", balance: "1450", apr: "26.99", minPayment: "45" }),
];

const usd = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

function monthsLabel(n: number): string {
  if (n <= 0) return "0 months";
  const y = Math.floor(n / 12);
  const m = n % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} yr${y > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} mo`);
  return parts.join(" ");
}

function toDebtInputs(rows: DebtRow[]): DebtInput[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name.trim() || "Debt",
    balance: parseFloat(r.balance) || 0,
    apr: parseFloat(r.apr) || 0,
    minPayment: parseFloat(r.minPayment) || 0,
  }));
}

export default function DebtEscapeClient({
  signedIn,
  unlocked,
  justPurchased,
}: {
  signedIn: boolean;
  unlocked: boolean;
  justPurchased: boolean;
}) {
  const [rows, setRows] = useState<DebtRow[]>(DEFAULT_ROWS);
  const [extra, setExtra] = useState(50);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  // Stable "now" for date projections so the table doesn't shift across renders.
  const [now] = useState(() => new Date());

  const updateRow = (id: string, patch: Partial<DebtRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => (rs.length >= 10 ? rs : [...rs, newRow()]));
  const removeRow = (id: string) =>
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));

  const debts = useMemo(() => toDebtInputs(rows), [rows]);
  const hasUsableDebt = debts.some((d) => d.balance > 0 && d.minPayment > 0);

  const result = useMemo(
    () => (hasUsableDebt ? compareStrategies(debts, extra) : null),
    [debts, extra, hasUsableDebt]
  );

  const best = result
    ? result.bestStrategy === "avalanche"
      ? result.avalanche
      : result.snowball
    : null;

  function monthLabel(monthIndex: number): string {
    const d = new Date(now.getFullYear(), now.getMonth() + monthIndex, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  async function startCheckout() {
    setCheckoutError(null);
    if (!signedIn) {
      window.location.href = `/login?next=${encodeURIComponent(APP_ROUTE)}`;
      return;
    }
    setRedirecting(true);
    try {
      const res = await fetch("/api/apps/debt-escape/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.alreadyOwned) {
          window.location.reload();
          return;
        }
        setCheckoutError(data.error || "Could not start checkout.");
        setRedirecting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Network error. Please try again.");
      setRedirecting(false);
    }
  }

  async function downloadPdf() {
    if (!result || !best) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const left = 56;
    let y = 64;
    const line = (txt: string, size = 11, gap = 16, bold = false) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(txt, left, y);
      y += gap;
    };

    line("Debt Escape Plan", 22, 30, true);
    line(`Generated ${now.toLocaleDateString("en-US")}  ·  yesbundles.com`, 10, 26);

    const bestName = result.bestStrategy === "avalanche" ? "Avalanche" : "Snowball";
    line(
      `Debt-free in ${monthsLabel(best.months)} with ${bestName}`,
      14,
      22,
      true
    );
    line(`Total interest paid: ${usd(best.totalInterest)}`, 12, 18);
    line(
      `Interest saved by adding ${usd(extra)}/mo vs minimum-only: ${usd(
        result.interestSavedVsMinimumOnly
      )}`,
      12,
      24
    );

    line("Snowball vs Avalanche", 14, 22, true);
    line(
      `Snowball:  ${monthsLabel(result.snowball.months)},  ${usd(
        result.snowball.totalInterest
      )} interest`,
      11,
      16
    );
    line(
      `Avalanche: ${monthsLabel(result.avalanche.months)},  ${usd(
        result.avalanche.totalInterest
      )} interest`,
      11,
      16
    );
    line(
      `Avalanche saves ${usd(result.interestSavedWithAvalanche)} vs Snowball`,
      11,
      24
    );

    line(`Payoff order (${bestName})`, 14, 22, true);
    for (const p of best.perDebtPayoffOrder) {
      line(
        `${p.order}. ${p.name} — paid off ${monthLabel(p.payoffMonth)} (month ${p.payoffMonth})`,
        11,
        16
      );
    }
    y += 8;

    line(`Month-by-month (${bestName})`, 14, 22, true);
    line("Month        Payment      Interest     Balance", 10, 15, true);
    for (const m of best.monthlyBreakdown) {
      if (y > 720) {
        doc.addPage();
        y = 64;
      }
      const col = (s: string, w: number) => s.padEnd(w);
      line(
        col(monthLabel(m.month), 13) +
          col(usd(m.payment), 13) +
          col(usd(m.interest), 13) +
          usd(m.endBalance),
        10,
        14
      );
    }

    doc.save("debt-escape-plan.pdf");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-electric-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-electric-700">
          <Sparkles className="h-3.5 w-3.5" />
          YesBundles Pro
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          Debt Escape Simulator
        </h1>
        <p className="mt-2 max-w-2xl text-navy-600">
          Compare the <strong>Snowball</strong> and <strong>Avalanche</strong>{" "}
          payoff strategies side by side, then see how much faster you escape by
          adding a little extra each month.
        </p>
      </div>

      {justPurchased && unlocked && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CircleCheck className="h-5 w-5 shrink-0" />
          Purchase complete — your full plan is unlocked. Thanks for going Pro!
        </div>
      )}

      {justPurchased && !unlocked && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-electric-200 bg-electric-50 px-4 py-3 text-sm font-medium text-navy-800">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-electric-600" />
            Payment received — we&apos;re finalizing your access. This takes a few
            seconds.
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-bone-50 hover:bg-navy-800"
          >
            Refresh
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Inputs ─────────────────────────────────────────────── */}
        <section className="lg:col-span-3">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">Your debts</h2>
              <span className="text-xs text-navy-500">{rows.length}/10</span>
            </div>

            {/* column labels (desktop) */}
            <div className="mb-1 hidden grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] gap-2 px-1 text-xs font-medium text-navy-500 sm:grid">
              <span>Name</span>
              <span>Balance</span>
              <span>APR %</span>
              <span>Min / mo</span>
              <span className="w-7" />
            </div>

            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto]"
                >
                  <input
                    aria-label="Debt name"
                    placeholder="Visa"
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    className="col-span-2 rounded-lg border border-navy-200 bg-bone-50 px-3 py-2 text-sm text-navy-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-electric-500 sm:col-span-1"
                  />
                  <input
                    aria-label="Balance"
                    inputMode="decimal"
                    placeholder="$ balance"
                    value={r.balance}
                    onChange={(e) =>
                      updateRow(r.id, { balance: e.target.value })
                    }
                    className="rounded-lg border border-navy-200 bg-bone-50 px-3 py-2 text-sm text-navy-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                  <input
                    aria-label="APR"
                    inputMode="decimal"
                    placeholder="APR"
                    value={r.apr}
                    onChange={(e) => updateRow(r.id, { apr: e.target.value })}
                    className="rounded-lg border border-navy-200 bg-bone-50 px-3 py-2 text-sm text-navy-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                  <input
                    aria-label="Minimum payment"
                    inputMode="decimal"
                    placeholder="min"
                    value={r.minPayment}
                    onChange={(e) =>
                      updateRow(r.id, { minPayment: e.target.value })
                    }
                    className="rounded-lg border border-navy-200 bg-bone-50 px-3 py-2 text-sm text-navy-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    disabled={rows.length <= 1}
                    aria-label="Remove debt"
                    className="flex items-center justify-center rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= 10}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-bone-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add a debt
            </button>
          </div>

          {/* Extra payment slider */}
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-card">
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="extra" className="text-lg font-bold text-navy-900">
                Extra payment / month
              </label>
              <span className="text-2xl font-bold text-electric-600">
                {usd(extra)}
              </span>
            </div>
            <input
              id="extra"
              type="range"
              min={0}
              max={1000}
              step={10}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="w-full accent-electric-600"
            />
            <div className="mt-1 flex justify-between text-xs text-navy-400">
              <span>$0</span>
              <span>$1,000</span>
            </div>
          </div>
        </section>

        {/* ── Results ─────────────────────────────────────────────── */}
        <section className="lg:col-span-2">
          {!result || !best ? (
            <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center text-navy-500 shadow-card">
              Enter at least one debt with a balance and minimum payment to see
              your escape plan.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Free headline — always visible */}
              <div className="rounded-2xl bg-navy-900 p-6 text-bone-50 shadow-card">
                <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-electric-300">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Best plan: {result.bestStrategy === "avalanche" ? "Avalanche" : "Snowball"}
                </div>
                <p className="text-2xl font-bold leading-tight">
                  Debt-free in {monthsLabel(best.months)}
                </p>
                <p className="mt-1 text-bone-200">
                  with {usd(best.totalInterest)} in total interest
                </p>
                {!best.feasible && (
                  <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-100">
                    Heads up: your minimum payments barely cover interest. Add an
                    extra payment to actually escape.
                  </p>
                )}
              </div>

              {/* Free preview: first 3 months */}
              <FreeTimeline
                schedule={best}
                monthLabel={monthLabel}
              />

              {/* Locked / unlocked full results */}
              {unlocked ? (
                <FullResults
                  result={result}
                  best={best}
                  extra={extra}
                  monthLabel={monthLabel}
                  onDownload={downloadPdf}
                />
              ) : (
                <LockedResults
                  result={result}
                  best={best}
                  signedIn={signedIn}
                  redirecting={redirecting}
                  checkoutError={checkoutError}
                  onUnlock={startCheckout}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Free preview: headline numbers + first 3 months only ───────────────
function FreeTimeline({
  schedule,
  monthLabel,
}: {
  schedule: Schedule;
  monthLabel: (m: number) => string;
}) {
  const preview = schedule.monthlyBreakdown.slice(0, 3);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-navy-900">Your first 3 months</h3>
        <span className="rounded-full bg-bone-100 px-2 py-0.5 text-xs font-medium text-navy-500">
          Free preview
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-navy-100">
        <table className="w-full text-sm">
          <thead className="bg-bone-100 text-xs uppercase tracking-wide text-navy-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Month</th>
              <th className="px-3 py-2 text-right font-medium">Payment</th>
              <th className="px-3 py-2 text-right font-medium">Interest</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {preview.map((m) => (
              <tr key={m.month}>
                <td className="px-3 py-2 text-navy-700">{monthLabel(m.month)}</td>
                <td className="px-3 py-2 text-right text-navy-700">
                  {usd(m.payment)}
                </td>
                <td className="px-3 py-2 text-right text-navy-500">
                  {usd(m.interest)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-navy-900">
                  {usd(m.endBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Locked state: blurred full results + paywall CTA ───────────────────
function LockedResults({
  result,
  best,
  signedIn,
  redirecting,
  checkoutError,
  onUnlock,
}: {
  result: ReturnType<typeof compareStrategies>;
  best: Schedule;
  signedIn: boolean;
  redirecting: boolean;
  checkoutError: string | null;
  onUnlock: () => void;
}) {
  const price = (APP_PRICE_CENTS / 100).toFixed(0);
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Blurred teaser of what's behind the wall */}
      <div
        aria-hidden
        className="pointer-events-none select-none blur-[6px]"
      >
        <FullResults
          result={result}
          best={best}
          extra={0}
          monthLabel={(m) => `Month ${m}`}
          onDownload={() => {}}
          preview
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-bone-50/40 to-bone-50/90 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-6 text-center shadow-card-hover">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-bone-50">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-navy-900">
            Unlock your full plan
          </h3>
          <ul className="mx-auto mt-3 space-y-1.5 text-left text-sm text-navy-600">
            <li className="flex items-center gap-2">
              <Scale className="h-4 w-4 shrink-0 text-electric-600" />
              Snowball vs Avalanche, side by side
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-electric-600" />
              Full month-by-month timeline & chart
            </li>
            <li className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 shrink-0 text-electric-600" />
              Per-debt payoff dates + interest saved
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-4 w-4 shrink-0 text-electric-600" />
              Download your plan as a PDF
            </li>
          </ul>

          {checkoutError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {checkoutError}
            </div>
          )}

          <button
            type="button"
            onClick={onUnlock}
            disabled={redirecting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-bone-50 hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {redirecting ? (
              "Redirecting…"
            ) : (
              <>
                Unlock full plan — ${price}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="mt-2 text-xs text-navy-400">
            {signedIn
              ? "One-time payment · lifetime access"
              : "You'll sign in first, then check out"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Full unlocked results ──────────────────────────────────────────────
function FullResults({
  result,
  best,
  extra,
  monthLabel,
  onDownload,
  preview = false,
}: {
  result: ReturnType<typeof compareStrategies>;
  best: Schedule;
  extra: number;
  monthLabel: (m: number) => string;
  onDownload: () => void;
  preview?: boolean;
}) {
  const { snowball, avalanche } = result;
  return (
    <div className="space-y-4">
      {/* Avalanche-vs-snowball headline */}
      {result.interestSavedWithAvalanche > 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-sm text-emerald-700">You save</p>
          <p className="text-2xl font-bold text-emerald-800">
            {usd(result.interestSavedWithAvalanche)}
          </p>
          <p className="text-sm text-emerald-700">
            choosing Avalanche over Snowball
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-navy-100 bg-white p-4 text-center text-sm text-navy-600 shadow-card">
          Snowball and Avalanche cost about the same here — pick whichever keeps
          you motivated.
        </div>
      )}

      {/* Comparison cards */}
      <div className="grid grid-cols-2 gap-3">
        <StrategyCard
          title="Snowball"
          subtitle="Smallest balance first"
          schedule={snowball}
          highlight={result.bestStrategy === "snowball"}
        />
        <StrategyCard
          title="Avalanche"
          subtitle="Highest APR first"
          schedule={avalanche}
          highlight={result.bestStrategy === "avalanche"}
        />
      </div>

      {/* Savings vs minimum-only */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-1 font-bold text-navy-900">
          The power of your extra {usd(extra)}/mo
        </h3>
        <p className="text-sm text-navy-600">
          Versus paying only the minimums, your extra payment saves{" "}
          <strong className="text-emerald-700">
            {usd(result.interestSavedVsMinimumOnly)}
          </strong>{" "}
          in interest and gets you out{" "}
          <strong className="text-navy-900">
            {monthsLabel(result.monthsSavedVsMinimumOnly)}
          </strong>{" "}
          sooner.
        </p>
      </div>

      {/* Balance chart */}
      <BalanceChart snowball={snowball} avalanche={avalanche} />

      {/* Per-debt payoff order */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 font-bold text-navy-900">
          Payoff order ({result.bestStrategy === "avalanche" ? "Avalanche" : "Snowball"})
        </h3>
        <ol className="space-y-2">
          {best.perDebtPayoffOrder.map((p) => (
            <li
              key={p.debtId}
              className="flex items-center gap-3 rounded-lg border border-navy-100 bg-bone-50 px-3 py-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-bone-50">
                {p.order}
              </span>
              <span className="flex-1 font-medium text-navy-900">{p.name}</span>
              <span className="text-sm text-navy-500">{monthLabel(p.payoffMonth)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Full timeline table */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 font-bold text-navy-900">
          Full timeline ({result.bestStrategy === "avalanche" ? "Avalanche" : "Snowball"})
        </h3>
        <div className="max-h-80 overflow-auto rounded-lg border border-navy-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bone-100 text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Payment</th>
                <th className="px-3 py-2 text-right font-medium">Interest</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {best.monthlyBreakdown.map((m) => (
                <tr key={m.month}>
                  <td className="px-3 py-2 text-navy-700">{monthLabel(m.month)}</td>
                  <td className="px-3 py-2 text-right text-navy-700">{usd(m.payment)}</td>
                  <td className="px-3 py-2 text-right text-navy-500">{usd(m.interest)}</td>
                  <td className="px-3 py-2 text-right font-medium text-navy-900">
                    {usd(m.endBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download */}
      {!preview && (
        <button
          type="button"
          onClick={onDownload}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-electric-600 px-5 py-3 text-sm font-semibold text-bone-50 hover:bg-electric-700"
        >
          <Download className="h-4 w-4" />
          Download my plan (PDF)
        </button>
      )}
    </div>
  );
}

function StrategyCard({
  title,
  subtitle,
  schedule,
  highlight,
}: {
  title: string;
  subtitle: string;
  schedule: Schedule;
  highlight: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl p-4 shadow-card " +
        (highlight
          ? "border-2 border-emerald-400 bg-white"
          : "border border-navy-100 bg-white")
      }
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-navy-900">{title}</h4>
        {highlight && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
            Best
          </span>
        )}
      </div>
      <p className="text-xs text-navy-500">{subtitle}</p>
      <div className="mt-3 space-y-1.5">
        <div>
          <p className="text-xs text-navy-500">Time to debt-free</p>
          <p className="text-lg font-bold text-navy-900">
            {monthsLabel(schedule.months)}
          </p>
        </div>
        <div>
          <p className="text-xs text-navy-500">Total interest</p>
          <p className="text-lg font-bold text-navy-900">
            {usd(schedule.totalInterest)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Inline SVG balance-over-time chart (no chart lib needed) ───────────
function BalanceChart({
  snowball,
  avalanche,
}: {
  snowball: Schedule;
  avalanche: Schedule;
}) {
  const W = 520;
  const H = 200;
  const pad = { l: 8, r: 8, t: 12, b: 8 };
  const maxMonths = Math.max(
    snowball.monthlyBreakdown.length,
    avalanche.monthlyBreakdown.length,
    1
  );
  const startBalance = Math.max(
    snowball.monthlyBreakdown[0]?.endBalance ?? 0,
    avalanche.monthlyBreakdown[0]?.endBalance ?? 0,
    1
  );

  const path = (s: Schedule) => {
    const pts = s.monthlyBreakdown.map((m, i) => {
      const x =
        pad.l + (i / Math.max(maxMonths - 1, 1)) * (W - pad.l - pad.r);
      const y =
        pad.t + (1 - m.endBalance / startBalance) * (H - pad.t - pad.b);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return "M " + pts.join(" L ");
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h3 className="mb-1 font-bold text-navy-900">Balance over time</h3>
      <div className="mb-3 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-navy-600">
          <span className="inline-block h-2 w-3 rounded-sm bg-navy-400" />
          Snowball
        </span>
        <span className="flex items-center gap-1.5 text-navy-600">
          <span className="inline-block h-2 w-3 rounded-sm bg-electric-500" />
          Avalanche
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Remaining balance over time for snowball versus avalanche"
      >
        <path
          d={path(snowball)}
          fill="none"
          stroke="#5a7fc0"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <path
          d={path(avalanche)}
          fill="none"
          stroke="#06aad1"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
