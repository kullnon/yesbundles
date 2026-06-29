import { NextResponse } from "next/server";
// Type-only import (erased at build — cannot throw at module load).
import type AnthropicSDK from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { APP_SLUG } from "@/lib/apps/salary-negotiation/config";
import { lookupComp, offerGap } from "@/lib/apps/salary-negotiation/comp";

// Anthropic responses can take 15-20s — give the function room so Vercel
// doesn't kill it mid-request (which surfaces as a 502 with no app logs).
export const maxDuration = 30;
export const runtime = "nodejs";

// Server-only. ANTHROPIC_API_KEY must never reach the client.
// claude-opus-4-8 is current and supported on @anthropic-ai/sdk 0.107.x
// (verified accepted by the API — it does not 404).
const MODEL = "claude-opus-4-8";

const isDev = process.env.NODE_ENV !== "production";

// ── In-memory IP rate limiter: 5 generations / IP / hour ──────────────
// Lightweight per-instance abuse guard (resets on cold start). Pure, never
// throws at module load.
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

// Structured-output schema — guarantees parseable JSON in the shape the UI/PDF
// consume. (No min/max/length constraints — not supported by the validator.)
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "counterConservative",
    "counterAggressive",
    "counterReasoning",
    "script",
    "emailTemplate",
    "rebuttals",
    "benefitsFlags",
  ],
  properties: {
    counterConservative: {
      type: "object",
      additionalProperties: false,
      required: ["low", "high"],
      properties: {
        low: { type: "integer", description: "Conservative counter range low, whole USD base salary" },
        high: { type: "integer", description: "Conservative counter range high, whole USD base salary" },
      },
    },
    counterAggressive: {
      type: "object",
      additionalProperties: false,
      required: ["low", "high"],
      properties: {
        low: { type: "integer", description: "Aggressive counter range low, whole USD base salary" },
        high: { type: "integer", description: "Aggressive counter range high, whole USD base salary" },
      },
    },
    counterReasoning: {
      type: "string",
      description: "2-4 sentences explaining the counter ranges, grounded in the benchmark.",
    },
    script: {
      type: "string",
      description: "A 200-400 word first-person negotiation script for the live call.",
    },
    emailTemplate: {
      type: "string",
      description: "A ready-to-send email reply countering the offer, personalized to their numbers.",
    },
    rebuttals: {
      type: "array",
      description: "Exactly four rebuttals, one per common pushback, in the given order.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pushback", "response"],
        properties: {
          pushback: { type: "string" },
          response: { type: "string" },
        },
      },
    },
    benefitsFlags: {
      type: "array",
      description: "Standard comp/benefits items that appear missing or worth clarifying. Empty array if none.",
      items: { type: "string" },
    },
  },
} as const;

interface GenerateBody {
  role?: string;
  city?: string;
  yoe?: number;
  baseSalary?: number;
  signingBonus?: number;
  equity?: number;
  benefitsNotes?: string;
  offerEmail?: string;
}

export async function POST(request: Request) {
  // Sanity log — proves the env var is reaching the runtime (presence + length
  // only, never the value).
  console.log(
    "[salary-negotiation/generate] hit, ANTHROPIC_API_KEY present:",
    !!process.env.ANTHROPIC_API_KEY,
    "length:",
    process.env.ANTHROPIC_API_KEY?.length ?? 0
  );

  // Entire handler is wrapped so ANY throw is logged and returned as JSON 500
  // instead of crashing the function (which would be a 502 with no app logs).
  try {
    // 1. Auth — must be signed in.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    // 2. Entitlement — must own this app.
    const admin = createAdminClient();
    const { data: entitlement } = await admin
      .from("app_entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_slug", APP_SLUG)
      .limit(1)
      .maybeSingle();
    if (!entitlement) {
      return NextResponse.json(
        { error: "This feature requires the Salary Negotiation Coach. Unlock it for $29." },
        { status: 403 }
      );
    }

    // 3. Rate limit by IP.
    if (rateLimited(clientIp(request))) {
      return NextResponse.json(
        { error: "Rate limit reached (5 generations per hour). Please try again later." },
        { status: 429 }
      );
    }

    // 4. Fail loudly if the AI key is missing.
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("[salary-negotiation/generate] ANTHROPIC_API_KEY is not set.");
      return NextResponse.json(
        { error: "AI generation is temporarily unavailable. Please contact support." },
        { status: 500 }
      );
    }

    // 5. Validate inputs.
    let body: GenerateBody;
    try {
      body = (await request.json()) as GenerateBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const role = (body.role ?? "").toString().slice(0, 200).trim();
    const city = (body.city ?? "").toString().slice(0, 120).trim();
    const yoe = Number.isFinite(body.yoe) ? Math.max(0, Math.min(50, Number(body.yoe))) : 0;
    const baseSalary = Number.isFinite(body.baseSalary) ? Math.max(0, Number(body.baseSalary)) : 0;
    const signingBonus = Number.isFinite(body.signingBonus) ? Math.max(0, Number(body.signingBonus)) : 0;
    const equity = Number.isFinite(body.equity) ? Math.max(0, Number(body.equity)) : 0;
    const benefitsNotes = (body.benefitsNotes ?? "").toString().slice(0, 1500).trim();
    const offerEmail = (body.offerEmail ?? "").toString().slice(0, 4000).trim();

    if (!role || baseSalary <= 0) {
      return NextResponse.json(
        { error: "Role title and base salary are required." },
        { status: 400 }
      );
    }

    // 6. Compute the benchmark + gap server-side (authoritative).
    const comp = lookupComp(role, city, yoe);
    const gap = offerGap(baseSalary, comp);

    const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

    const system = [
      "You are an expert salary negotiation coach who has helped thousands of professionals negotiate offers.",
      "You write specific, confident, collaborative, and professional guidance — never generic filler.",
      "Ground every number in the market benchmark provided. Do not invent benchmark figures.",
      "Counter ranges are BASE SALARY in whole US dollars. The conservative range should be defensible and near-to-slightly-above the market median; the aggressive range should reach toward the top quartile without being unrealistic.",
      "The negotiation script is what the candidate says out loud on the call: warm, anchored on value and market data, 200-400 words, first person.",
      "The email template is a complete, ready-to-send reply to the recruiter that counters the offer using their actual numbers and a specific ask.",
      "Provide EXACTLY FOUR rebuttals, one for each of these pushbacks, in this exact order: 1) \"What's your current salary?\" 2) \"This is our best offer\" 3) \"We have other candidates\" 4) \"The budget is fixed\". Each response is 2-4 sentences the candidate can say verbatim.",
      "For benefitsFlags, list standard compensation/benefits components that appear MISSING or unclear from the candidate's notes (e.g. 401(k) match, health insurance, PTO, equity/RSUs, signing bonus, remote/relocation). Return an empty array if everything standard is covered.",
    ].join("\n");

    const userPrompt = [
      "Generate a personalized salary negotiation plan.",
      "",
      "## Candidate & offer",
      `Role: ${role}`,
      `Location: ${city || "(not specified)"}`,
      `Years of experience: ${yoe}`,
      `Base salary offered: ${usd(baseSalary)}`,
      `Signing bonus: ${signingBonus > 0 ? usd(signingBonus) : "(none / not specified)"}`,
      `Annual equity / RSU grant value: ${equity > 0 ? usd(equity) : "(none / not specified)"}`,
      `Benefits notes from candidate: ${benefitsNotes || "(none provided)"}`,
      "",
      "## Market benchmark (authoritative — use these figures)",
      `Matched role: ${comp.matchedRole}${comp.roleMatched ? "" : " (generic fallback — no exact role match)"}`,
      `Matched market: ${comp.matchedMetro}${comp.metroMatched ? "" : " (national average — no metro match)"}`,
      `Base salary P25: ${usd(comp.p25)}`,
      `Base salary P50 (median): ${usd(comp.p50)}`,
      `Base salary P75: ${usd(comp.p75)}`,
      `The offer of ${usd(baseSalary)} is ${gap.belowMarket ? `${usd(gap.gapToMedian)} BELOW` : `${usd(-gap.gapToMedian)} ABOVE`} the market median (≈ ${gap.percentile}th percentile).`,
      "",
      offerEmail ? `## Offer email (for context)\n${offerEmail}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // 7. Lazy-load + instantiate the Anthropic client INSIDE the handler so an
    //    SDK load or constructor error is caught here, not at module load.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // output_config is passed through to the API; cast keeps us decoupled from
    // the installed SDK's typings.
    const params = {
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    } as unknown as AnthropicSDK.MessageCreateParamsNonStreaming;

    const response = await anthropic.messages.create(params);

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    if (!raw) {
      throw new Error(`Empty AI response (stop_reason: ${response.stop_reason})`);
    }

    const plan = JSON.parse(raw);

    return NextResponse.json({ comp, gap, plan });
  } catch (e) {
    const err = e as { message?: string; stack?: string; name?: string };
    console.error("[salary-negotiation/generate] CRASH:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    });
    return NextResponse.json(
      {
        error: isDev
          ? `Generation error: ${err?.message ?? "unknown error"}`
          : "Generation failed. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
