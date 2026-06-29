"use client";

import { useMemo, useState } from "react";
import {
  Lock,
  Download,
  Sparkles,
  ArrowRight,
  CircleCheck,
  TrendingUp,
  ScrollText,
  Mail,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react";
import { lookupComp, offerGap } from "@/lib/apps/salary-negotiation/comp";
import { APP_ROUTE, APP_PRICE_CENTS } from "@/lib/apps/salary-negotiation/config";

interface Plan {
  counterConservative: { low: number; high: number };
  counterAggressive: { low: number; high: number };
  counterReasoning: string;
  script: string;
  emailTemplate: string;
  rebuttals: { pushback: string; response: string }[];
  benefitsFlags: string[];
}

const usd = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

// 1 -> "1st", 22 -> "22nd", 13 -> "13th"
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// A single static rebuttal shown free, pre-purchase (no AI call).
const SAMPLE_REBUTTAL = {
  pushback: "What's your current salary?",
  response:
    "I'd rather focus on the value I'll bring to this role and what the market rate is for it. Based on my research, roles like this in this market land in a specific range — I'm confident we can find a number that works for both of us.",
};

export default function SalaryCoachClient({
  signedIn,
  unlocked,
  justPurchased,
}: {
  signedIn: boolean;
  unlocked: boolean;
  justPurchased: boolean;
}) {
  const [role, setRole] = useState("Senior Software Engineer");
  const [city, setCity] = useState("Austin, TX");
  const [yoe, setYoe] = useState("8");
  const [baseSalary, setBaseSalary] = useState("150000");
  const [signingBonus, setSigningBonus] = useState("10000");
  const [equity, setEquity] = useState("");
  const [benefitsNotes, setBenefitsNotes] = useState("");
  const [offerEmail, setOfferEmail] = useState("");

  const [redirecting, setRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const base = parseFloat(baseSalary) || 0;
  const yoeNum = parseFloat(yoe) || 0;
  const hasUsableInput = role.trim().length > 0 && base > 0;

  const comp = useMemo(
    () => (hasUsableInput ? lookupComp(role, city, yoeNum) : null),
    [role, city, yoeNum, hasUsableInput]
  );
  const gap = useMemo(
    () => (comp ? offerGap(base, comp) : null),
    [comp, base]
  );

  async function startCheckout() {
    setCheckoutError(null);
    if (!signedIn) {
      window.location.href = `/login?next=${encodeURIComponent(APP_ROUTE)}`;
      return;
    }
    setRedirecting(true);
    try {
      const res = await fetch("/api/apps/salary-negotiation/checkout", {
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

  async function generate() {
    setGenError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/apps/salary-negotiation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.trim(),
          city: city.trim(),
          yoe: yoeNum,
          baseSalary: base,
          signingBonus: parseFloat(signingBonus) || 0,
          equity: parseFloat(equity) || 0,
          benefitsNotes: benefitsNotes.trim(),
          offerEmail: offerEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Generation failed.");
        setGenerating(false);
        return;
      }
      setPlan(data.plan as Plan);
      setGenerating(false);
    } catch {
      setGenError("Network error. Please try again.");
      setGenerating(false);
    }
  }

  async function downloadPdf() {
    if (!plan || !comp) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const left = 56;
    const maxWidth = 500;
    let y = 64;
    const line = (txt: string, size = 11, gap = 16, bold = false) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const wrapped = doc.splitTextToSize(txt, maxWidth) as string[];
      for (const w of wrapped) {
        if (y > 740) {
          doc.addPage();
          y = 64;
        }
        doc.text(w, left, y);
        y += gap;
      }
    };

    line("Salary Negotiation Plan", 22, 30, true);
    line(`${role} · ${city || "—"} · ${yoeNum} yrs · yesbundles.com`, 10, 24);

    line("Market benchmark (base salary)", 14, 20, true);
    line(`P25 ${usd(comp.p25)}   |   P50 ${usd(comp.p50)}   |   P75 ${usd(comp.p75)}`, 11, 16);
    line(`Your offer: ${usd(base)}`, 11, 22);

    line("Counter-offer recommendation", 14, 20, true);
    line(`Conservative: ${usd(plan.counterConservative.low)}–${usd(plan.counterConservative.high)}`, 11, 16);
    line(`Aggressive:   ${usd(plan.counterAggressive.low)}–${usd(plan.counterAggressive.high)}`, 11, 16);
    line(plan.counterReasoning, 11, 16);
    y += 8;

    line("Negotiation script", 14, 20, true);
    line(plan.script, 11, 15);
    y += 8;

    line("Email reply template", 14, 20, true);
    line(plan.emailTemplate, 11, 15);
    y += 8;

    line("Rebuttals to common pushbacks", 14, 20, true);
    for (const r of plan.rebuttals) {
      line(`Q: ${r.pushback}`, 11, 15, true);
      line(`A: ${r.response}`, 11, 15);
      y += 4;
    }

    if (plan.benefitsFlags.length) {
      y += 4;
      line("Benefits to clarify", 14, 20, true);
      for (const f of plan.benefitsFlags) line(`• ${f}`, 11, 15);
    }

    doc.save("salary-negotiation-plan.pdf");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-electric-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-electric-700">
          <Sparkles className="h-3.5 w-3.5" />
          YesBundles Pro
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          Salary Negotiation Coach
        </h1>
        <p className="mt-2 max-w-2xl text-navy-600">
          See how your offer stacks up against the market, then get a
          personalized counter-offer script, email template, and rebuttals to
          every recruiter pushback.
        </p>
      </div>

      {justPurchased && unlocked && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CircleCheck className="h-5 w-5 shrink-0" />
          Purchase complete — your coach is unlocked. Fill in your offer and
          generate your plan.
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

      <div className="space-y-6">
        {/* ── Inputs ───────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-4 text-lg font-bold text-navy-900">Your offer</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role title" className="sm:col-span-2">
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Senior Software Engineer"
                className={inputCls}
              />
            </Field>
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin, TX"
                className={inputCls}
              />
            </Field>
            <Field label="Years of experience">
              <input
                value={yoe}
                onChange={(e) => setYoe(e.target.value)}
                inputMode="decimal"
                placeholder="8"
                className={inputCls}
              />
            </Field>
            <Field label="Base salary offered (USD)">
              <input
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                inputMode="decimal"
                placeholder="150000"
                className={inputCls}
              />
            </Field>
            <Field label="Signing bonus (optional)">
              <input
                value={signingBonus}
                onChange={(e) => setSigningBonus(e.target.value)}
                inputMode="decimal"
                placeholder="10000"
                className={inputCls}
              />
            </Field>
            <Field label="Annual equity / RSU value (optional)" className="sm:col-span-2">
              <input
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                inputMode="decimal"
                placeholder="40000"
                className={inputCls}
              />
            </Field>
            <Field label="Benefits notes (optional)" className="sm:col-span-2">
              <input
                value={benefitsNotes}
                onChange={(e) => setBenefitsNotes(e.target.value)}
                placeholder="401k match 4%, health covered, 15 days PTO…"
                className={inputCls}
              />
            </Field>
            <Field label="Paste the offer email (optional)" className="sm:col-span-2">
              <textarea
                value={offerEmail}
                onChange={(e) => setOfferEmail(e.target.value)}
                rows={3}
                placeholder="Paste the recruiter's offer email here for a more tailored plan…"
                className={inputCls + " resize-y"}
              />
            </Field>
          </div>
        </section>

        {/* ── Results ──────────────────────────────────────────────── */}
        <section>
          {!hasUsableInput || !comp || !gap ? (
            <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center text-navy-500 shadow-card">
              Enter your role title and base salary to see how your offer
              compares to the market.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Free headline */}
              <div className="rounded-2xl bg-navy-900 p-6 text-bone-50 shadow-card">
                <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-electric-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Market check
                </div>
                {gap.belowMarket ? (
                  <p className="text-2xl font-bold leading-tight">
                    Your offer is {usd(gap.gapToMedian)} below market
                  </p>
                ) : (
                  <p className="text-2xl font-bold leading-tight">
                    Your offer is {usd(-gap.gapToMedian)} above market
                  </p>
                )}
                <p className="mt-1 text-bone-200">
                  for {comp.matchedRole} in {comp.matchedMetro} — about the{" "}
                  {ordinal(gap.percentile)} percentile (median {usd(comp.p50)}).
                </p>
                {(!comp.roleMatched || !comp.metroMatched) && (
                  <p className="mt-2 text-xs text-bone-300">
                    {!comp.roleMatched && "No exact role match — using a general baseline. "}
                    {!comp.metroMatched && "No metro match — using the national average."}
                  </p>
                )}
              </div>

              {/* Free sample rebuttal */}
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-navy-900">Sample rebuttal</h3>
                  <span className="rounded-full bg-bone-100 px-2 py-0.5 text-xs font-medium text-navy-500">
                    Free preview
                  </span>
                </div>
                <p className="text-sm font-semibold text-navy-700">
                  “{SAMPLE_REBUTTAL.pushback}”
                </p>
                <p className="mt-1 text-sm text-navy-600">{SAMPLE_REBUTTAL.response}</p>
              </div>

              {unlocked ? (
                <UnlockedPlan
                  comp={comp}
                  base={base}
                  plan={plan}
                  generating={generating}
                  genError={genError}
                  onGenerate={generate}
                  onDownload={downloadPdf}
                />
              ) : (
                <LockedPlan
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

const inputCls =
  "w-full min-w-0 rounded-lg border border-navy-200 bg-bone-50 px-3 py-2 text-sm text-navy-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-electric-500";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="mb-1 block text-xs font-medium text-navy-500">{label}</span>
      {children}
    </label>
  );
}

// ── Benchmark card (deterministic, from comp.ts) ───────────────────────
function BenchmarkCard({
  comp,
  base,
}: {
  comp: ReturnType<typeof lookupComp>;
  base: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h3 className="mb-3 font-bold text-navy-900">
        Market benchmark — {comp.matchedRole}
      </h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { k: "P25", v: comp.p25 },
          { k: "P50 (median)", v: comp.p50 },
          { k: "P75", v: comp.p75 },
        ].map((c) => (
          <div key={c.k} className="rounded-lg border border-navy-100 bg-bone-50 p-3">
            <p className="text-xs text-navy-500">{c.k}</p>
            <p className="text-lg font-bold text-navy-900">{usd(c.v)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-navy-600">
        Your offer: <strong className="text-navy-900">{usd(base)}</strong> ·{" "}
        {comp.matchedMetro}
      </p>
    </div>
  );
}

// ── Unlocked: generate + full AI plan ──────────────────────────────────
function UnlockedPlan({
  comp,
  base,
  plan,
  generating,
  genError,
  onGenerate,
  onDownload,
}: {
  comp: ReturnType<typeof lookupComp>;
  base: number;
  plan: Plan | null;
  generating: boolean;
  genError: string | null;
  onGenerate: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="space-y-4">
      <BenchmarkCard comp={comp} base={base} />

      {!plan && (
        <div className="rounded-2xl border border-electric-200 bg-electric-50 p-5 text-center">
          <p className="mb-3 text-sm text-navy-700">
            Generate your personalized negotiation plan — counter ranges, a full
            call script, an email reply, and rebuttals tailored to your offer.
          </p>
          {genError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {genError}
            </div>
          )}
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 px-6 py-3 text-sm font-semibold text-bone-50 hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              "Generating your plan…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate my plan
              </>
            )}
          </button>
        </div>
      )}

      {plan && (
        <PlanView
          plan={plan}
          generating={generating}
          genError={genError}
          onRegenerate={onGenerate}
          onDownload={onDownload}
        />
      )}
    </div>
  );
}

function PlanView({
  plan,
  generating,
  genError,
  onRegenerate,
  onDownload,
}: {
  plan: Plan;
  generating: boolean;
  genError: string | null;
  onRegenerate: () => void;
  onDownload: () => void;
}) {
  return (
    <>
      {/* Counter recommendation */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 font-bold text-navy-900">Your counter-offer</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-navy-100 bg-bone-50 p-3 text-center">
            <p className="text-xs text-navy-500">Conservative</p>
            <p className="text-base font-bold text-navy-900">
              {usd(plan.counterConservative.low)}–{usd(plan.counterConservative.high)}
            </p>
          </div>
          <div className="rounded-lg border-2 border-emerald-400 bg-white p-3 text-center">
            <p className="text-xs text-emerald-700">Aggressive</p>
            <p className="text-base font-bold text-navy-900">
              {usd(plan.counterAggressive.low)}–{usd(plan.counterAggressive.high)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-navy-600">{plan.counterReasoning}</p>
      </div>

      {/* Script */}
      <CopyCard
        icon={<ScrollText className="h-4 w-4 text-electric-600" />}
        title="Your negotiation script"
        text={plan.script}
      />

      {/* Email */}
      <CopyCard
        icon={<Mail className="h-4 w-4 text-electric-600" />}
        title="Email reply template"
        text={plan.emailTemplate}
        mono
      />

      {/* Rebuttals */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-navy-900">
          <MessageSquare className="h-4 w-4 text-electric-600" />
          Rebuttals to common pushbacks
        </h3>
        <div className="space-y-3">
          {plan.rebuttals.map((r, i) => (
            <div key={i} className="rounded-lg border border-navy-100 bg-bone-50 p-3">
              <p className="text-sm font-semibold text-navy-800">“{r.pushback}”</p>
              <p className="mt-1 text-sm text-navy-600">{r.response}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits flags */}
      {plan.benefitsFlags.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-2 font-bold text-amber-900">Benefits worth clarifying</h3>
          <ul className="space-y-1 text-sm text-amber-800">
            {plan.benefitsFlags.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {genError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {genError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-electric-600 px-5 py-3 text-sm font-semibold text-bone-50 hover:bg-electric-700"
        >
          <Download className="h-4 w-4" />
          Download my plan (PDF)
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={generating}
          className="rounded-full border border-navy-200 px-5 py-3 text-sm font-semibold text-navy-700 hover:bg-bone-100 disabled:opacity-50"
        >
          {generating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
    </>
  );
}

function CopyCard({
  icon,
  title,
  text,
  mono = false,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-navy-900">
          {icon}
          {title}
        </h3>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-full border border-navy-200 px-3 py-1 text-xs font-semibold text-navy-700 hover:bg-bone-100"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p
        className={
          "whitespace-pre-wrap text-sm leading-relaxed text-navy-700 " +
          (mono ? "font-mono text-[13px]" : "")
        }
      >
        {text}
      </p>
    </div>
  );
}

// ── Locked: blurred teaser + paywall ───────────────────────────────────
function LockedPlan({
  signedIn,
  redirecting,
  checkoutError,
  onUnlock,
}: {
  signedIn: boolean;
  redirecting: boolean;
  checkoutError: string | null;
  onUnlock: () => void;
}) {
  const price = (APP_PRICE_CENTS / 100).toFixed(0);
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Blurred teaser */}
      <div aria-hidden className="pointer-events-none select-none space-y-4 blur-[6px]">
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-3 h-4 w-40 rounded bg-navy-100" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded-lg bg-bone-100" />
            <div className="h-16 rounded-lg bg-bone-100" />
            <div className="h-16 rounded-lg bg-bone-100" />
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-2 h-4 w-48 rounded bg-navy-100" />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-bone-100" />
            <div className="h-3 w-full rounded bg-bone-100" />
            <div className="h-3 w-5/6 rounded bg-bone-100" />
            <div className="h-3 w-4/6 rounded bg-bone-100" />
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-2 h-4 w-44 rounded bg-navy-100" />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-bone-100" />
            <div className="h-3 w-5/6 rounded bg-bone-100" />
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-bone-50/40 to-bone-50/90 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-6 text-center shadow-card-hover">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-bone-50">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-navy-900">Unlock your full plan</h3>
          <ul className="mx-auto mt-3 space-y-1.5 text-left text-sm text-navy-600">
            <li className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0 text-electric-600" />
              Counter-offer ranges with reasoning
            </li>
            <li className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 shrink-0 text-electric-600" />
              A full, personalized call script
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-electric-600" />
              Ready-to-send email reply
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-electric-600" />
              All 4 rebuttals + PDF export
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
