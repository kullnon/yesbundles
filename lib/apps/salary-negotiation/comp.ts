// lib/apps/salary-negotiation/comp.ts
//
// Pure compensation-benchmark lookup for the Salary Negotiation Coach.
// Given a free-text role, a free-text city, and years of experience, returns
// the P25 / P50 / P75 base-salary benchmark in whole US dollars.
//
// This is intentionally a STATIC, SEEDED model — not a live data feed. It is
// the single isolation point for benchmarks: swap `lookupComp` for a real API
// (Levels.fyi, BLS, Payscale, …) later without touching the UI or the AI
// prompt, which both consume the same `CompBenchmark` shape.
//
// Model: nationalBase(role) × metroMultiplier(city) × experienceFactor(yoe).
// Numbers are rough, defensible mid-2020s US base-salary midpoints — good
// enough to anchor a negotiation conversation, not financial advice.

export interface CompBenchmark {
  /** Whole USD. */
  p25: number;
  p50: number;
  p75: number;
  /** Canonical role label we matched the input to. */
  matchedRole: string;
  /** Canonical metro label we matched the input to (or "National average"). */
  matchedMetro: string;
  /** False when we fell back to the generic role baseline. */
  roleMatched: boolean;
  /** False when we fell back to the national (1.0×) multiplier. */
  metroMatched: boolean;
}

interface RoleBaseline {
  label: string;
  /** National P25/P50/P75 base salary at ~5 years of experience, whole USD. */
  p25: number;
  p50: number;
  p75: number;
  /** Lowercased keywords that map free text to this role. */
  keywords: string[];
}

// ── ~12 common roles (national, ~5 YoE midpoint) ───────────────────────
const ROLES: RoleBaseline[] = [
  {
    label: "Software Engineer",
    p25: 110000, p50: 138000, p75: 172000,
    keywords: ["software engineer", "swe", "developer", "programmer", "software developer", "backend", "frontend", "full stack", "fullstack", "web developer"],
  },
  {
    label: "Senior Software Engineer",
    p25: 152000, p50: 188000, p75: 235000,
    keywords: ["senior software engineer", "staff software engineer", "principal software engineer", "senior software", "senior engineer", "staff engineer", "principal engineer", "senior swe", "lead engineer", "senior developer"],
  },
  {
    label: "Engineering Manager",
    p25: 178000, p50: 215000, p75: 268000,
    keywords: ["engineering manager", "eng manager", "director of engineering", "vp engineering", "head of engineering"],
  },
  {
    label: "Product Manager",
    p25: 122000, p50: 150000, p75: 188000,
    keywords: ["product manager", "product owner", "pm ", "group product", "senior product manager", "director of product"],
  },
  {
    label: "Data Scientist",
    p25: 118000, p50: 145000, p75: 182000,
    keywords: ["data scientist", "machine learning", "ml engineer", "ai engineer", "data science"],
  },
  {
    label: "Data Analyst",
    p25: 70000, p50: 88000, p75: 110000,
    keywords: ["data analyst", "business analyst", "bi analyst", "analytics"],
  },
  {
    label: "Product Designer",
    p25: 98000, p50: 125000, p75: 158000,
    keywords: ["designer", "ux", "ui", "product design", "ux designer", "ui designer", "design lead"],
  },
  {
    label: "Marketing Manager",
    p25: 82000, p50: 105000, p75: 135000,
    keywords: ["marketing manager", "marketing", "growth manager", "demand gen", "brand manager", "content manager"],
  },
  {
    label: "Account Executive",
    p25: 75000, p50: 100000, p75: 145000,
    keywords: ["account executive", "sales rep", "sales representative", "ae ", "sales executive", "account manager"],
  },
  {
    label: "Registered Nurse",
    p25: 72000, p50: 88000, p75: 108000,
    keywords: ["nurse", "rn ", "registered nurse", "nursing"],
  },
  {
    label: "Accountant",
    p25: 62000, p50: 78000, p75: 98000,
    keywords: ["accountant", "accounting", "auditor", "controller", "bookkeeper", "cpa"],
  },
  {
    label: "Project Manager",
    p25: 85000, p50: 108000, p75: 135000,
    keywords: ["project manager", "program manager", "scrum master", "delivery manager", "pmp"],
  },
  {
    label: "Customer Success Manager",
    p25: 72000, p50: 92000, p75: 118000,
    keywords: ["customer success", "csm", "client success", "customer support manager"],
  },
];

// Generic fallback when no role keyword matches.
const DEFAULT_ROLE: RoleBaseline = {
  label: "Professional (general)",
  p25: 70000, p50: 92000, p75: 120000,
  keywords: [],
};

// ── ~12 major US metros (cost-of-labor multipliers vs national avg) ────
interface Metro {
  label: string;
  mult: number;
  keywords: string[];
}

const METROS: Metro[] = [
  { label: "San Francisco Bay Area", mult: 1.34, keywords: ["san francisco", "sf", "bay area", "san jose", "silicon valley", "oakland", "palo alto", "mountain view"] },
  { label: "New York City", mult: 1.26, keywords: ["new york", "nyc", "manhattan", "brooklyn"] },
  { label: "Seattle", mult: 1.18, keywords: ["seattle", "bellevue", "redmond"] },
  { label: "Boston", mult: 1.14, keywords: ["boston", "cambridge"] },
  { label: "Washington, DC", mult: 1.12, keywords: ["washington", "dc", "d.c.", "arlington", "bethesda"] },
  { label: "Los Angeles", mult: 1.11, keywords: ["los angeles", "la ", "santa monica", "pasadena", "irvine", "orange county"] },
  { label: "Denver", mult: 1.04, keywords: ["denver", "boulder"] },
  { label: "Chicago", mult: 1.03, keywords: ["chicago"] },
  { label: "Austin", mult: 1.05, keywords: ["austin"] },
  { label: "Atlanta", mult: 0.99, keywords: ["atlanta"] },
  { label: "Miami", mult: 0.98, keywords: ["miami", "fort lauderdale"] },
  { label: "Dallas", mult: 1.0, keywords: ["dallas", "fort worth", "houston", "texas"] },
];

const NATIONAL: Metro = { label: "National average", mult: 1.0, keywords: [] };

function norm(s: string): string {
  return ` ${s.toLowerCase().trim().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ")} `;
}

function matchRole(roleInput: string): RoleBaseline {
  const hay = norm(roleInput);
  // Prefer the longest keyword match so "senior software engineer" beats "software engineer".
  let best: RoleBaseline | null = null;
  let bestLen = 0;
  for (const role of ROLES) {
    for (const kw of role.keywords) {
      if (hay.includes(` ${kw.trim()} `) || hay.includes(` ${kw.trim()}`)) {
        if (kw.length > bestLen) {
          best = role;
          bestLen = kw.length;
        }
      }
    }
  }
  return best ?? DEFAULT_ROLE;
}

function matchMetro(cityInput: string): Metro {
  const hay = norm(cityInput);
  let best: Metro | null = null;
  let bestLen = 0;
  for (const metro of METROS) {
    for (const kw of metro.keywords) {
      if (hay.includes(` ${kw.trim()} `) || hay.includes(` ${kw.trim()}`)) {
        if (kw.length > bestLen) {
          best = metro;
          bestLen = kw.length;
        }
      }
    }
  }
  return best ?? NATIONAL;
}

/**
 * Experience multiplier. ~0.72 at 0 years, 1.0 at 5 years, rising to ~1.5 by
 * 18+ years. Clamped so junior and very-senior inputs stay sane.
 */
export function experienceFactor(yoe: number): number {
  const y = Math.max(0, Math.min(40, yoe || 0));
  const factor = 0.72 + 0.056 * Math.min(y, 5) + 0.025 * Math.max(0, Math.min(y, 18) - 5);
  return Math.round(factor * 100) / 100;
}

const round100 = (n: number) => Math.round(n / 100) * 100;

/**
 * Look up a compensation benchmark. Pure and deterministic.
 */
export function lookupComp(
  role: string,
  city: string,
  yoe: number
): CompBenchmark {
  const r = matchRole(role);
  const m = matchMetro(city);
  const f = experienceFactor(yoe);
  const scale = m.mult * f;
  return {
    p25: round100(r.p25 * scale),
    p50: round100(r.p50 * scale),
    p75: round100(r.p75 * scale),
    matchedRole: r.label,
    matchedMetro: m.label,
    roleMatched: r !== DEFAULT_ROLE,
    metroMatched: m !== NATIONAL,
  };
}

export interface GapResult {
  /** Positive => offer is below market (P50). Negative => above. Whole USD. */
  gapToMedian: number;
  /** True when the offer is below the P50 median. */
  belowMarket: boolean;
  /** Rough percentile (0-100) of the offer within the P25..P75 band. */
  percentile: number;
}

/**
 * Compare a base-salary offer to the benchmark.
 */
export function offerGap(baseOffered: number, comp: CompBenchmark): GapResult {
  const gapToMedian = Math.round(comp.p50 - baseOffered);
  // Linear-ish percentile estimate across the P25..P75 band, extrapolated.
  let percentile: number;
  if (baseOffered <= comp.p25) {
    percentile = Math.max(2, 25 * (baseOffered / Math.max(comp.p25, 1)));
  } else if (baseOffered >= comp.p75) {
    percentile = Math.min(98, 75 + 23 * Math.min(1, (baseOffered - comp.p75) / Math.max(comp.p75 - comp.p50, 1)));
  } else if (baseOffered <= comp.p50) {
    percentile = 25 + 25 * ((baseOffered - comp.p25) / Math.max(comp.p50 - comp.p25, 1));
  } else {
    percentile = 50 + 25 * ((baseOffered - comp.p50) / Math.max(comp.p75 - comp.p50, 1));
  }
  return {
    gapToMedian,
    belowMarket: gapToMedian > 0,
    percentile: Math.round(percentile),
  };
}
