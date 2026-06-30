// lib/blog/writer.ts
// Anthropic-backed generation for the blog engine: the editor (title + meta +
// outline) and the writer (full body HTML + FAQs). Both encode the PawSignal
// lessons directly in the prompt. Pure of Next/React so the seed script can
// import it too.

import type { Cluster, Faq } from "./types";

const MODEL = "claude-opus-4-8";

// Lazy client — instantiate inside the call so a missing key / SDK load issue
// surfaces as a caught error, never a module-load crash (salary-negotiation lesson).
async function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function firstText(content: { type: string; text?: string }[]): string {
  const b = content.find((c) => c.type === "text");
  return b && b.text ? b.text : "";
}

// ── Editor: refine title, write meta description, produce an outline ───────
export interface OutlineResult {
  title: string;
  metaDescription: string;
  outline: string[];
}

const OUTLINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "metaDescription", "outline"],
  properties: {
    title: { type: "string", description: "Refined, specific, SEO-friendly post title (<= 70 chars)." },
    metaDescription: { type: "string", description: "Meta description, 140-160 chars, written for SERP click-through." },
    outline: {
      type: "array",
      description: "5-8 H2 section headings in logical reading order (exclude any FAQ section).",
      items: { type: "string" },
    },
  },
} as const;

export async function generateOutline(topic: {
  title: string;
  cluster: Cluster;
}): Promise<OutlineResult> {
  const client = await getClient();
  const system = [
    "You are the editor of a personal-finance and career blog. You turn a topic into a tight, search-optimized plan.",
    "Return a refined title, a meta description of 140-160 characters written to maximize search click-through, and 5-8 H2 section headings.",
    "Headings should be specific and benefit-driven, not generic. Do not include a 'Frequently asked questions' heading — that is added separately.",
    "No clickbait, no 'in today's fast-paced world' filler.",
  ].join("\n");
  const user = `Topic: ${topic.title}\nContent cluster: ${topic.cluster}\n\nProduce the title, meta description, and outline.`;

  const params = {
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: OUTLINE_SCHEMA } },
  } as unknown as Parameters<Awaited<ReturnType<typeof getClient>>["messages"]["create"]>[0];

  const res = await client.messages.create(params);
  const parsed = JSON.parse(firstText((res as { content: { type: string; text?: string }[] }).content)) as OutlineResult;
  // Clamp meta to a safe SERP length.
  parsed.metaDescription = parsed.metaDescription.slice(0, 160);
  return parsed;
}

// ── Writer: full article body (HTML) + structured FAQs ─────────────────────
export interface BodyResult {
  bodyHtml: string;
  faqs: Faq[];
}

const BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["bodyHtml", "faqs"],
  properties: {
    bodyHtml: {
      type: "string",
      description:
        "The article body as a valid HTML fragment (no <html>/<body>/<h1>). 1500-2500 words.",
    },
    faqs: {
      type: "array",
      description: "4-6 frequently asked questions with concise plain-text answers.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string", description: "2-4 sentence plain-text answer (no HTML)." },
        },
      },
    },
  },
} as const;

export async function generateBody(args: {
  title: string;
  cluster: Cluster;
  outline: string[];
  metaDescription: string;
  allowedPaths: string[];
}): Promise<BodyResult> {
  const client = await getClient();

  const allowlist = args.allowedPaths.map((p) => `- ${p}`).join("\n");
  const system = [
    "You are an expert writer for a personal-finance, career, and side-hustle blog. You write genuinely useful, specific articles.",
    "",
    "OUTPUT FORMAT:",
    "- Output a valid HTML fragment only. NO markdown. NO <html>, <head>, <body>, or <h1> tags (the title is rendered separately).",
    "- Use <h2> for sections, <h3> for sub-sections, plus <p>, <ul>/<ol>/<li>, <strong>, <em>, <blockquote>, and <table> where genuinely helpful.",
    "- Length: 1500-2500 words of real, substantive content. Use the provided outline as your section structure.",
    "- Do NOT include a Frequently Asked Questions section in bodyHtml — return those separately in the faqs field (4-6 Q&As).",
    "",
    "FACTUAL CLAIMS:",
    "- Do NOT fabricate citations or link to external sources. If you state a fact, attribute it GENERALLY (e.g. \"according to recent BLS data\", \"most lenders\", \"studies consistently find\") — never invent a specific URL or publication link.",
    "",
    "INTERNAL LINKS:",
    "- You may add 1-3 internal links, but ONLY to URLs in this exact allowlist. Never invent any other internal URL (especially never /blog/... links — they do not exist and will 404):",
    allowlist,
    "- Link naturally within a sentence where the destination is genuinely relevant. If nothing fits, add no links. Use root-relative hrefs exactly as listed.",
    "",
    "BRAND & TONE:",
    "- Do NOT mention YesBundles, 'our calculator', 'our tool', or any promotional language — a call-to-action is added by the template, not by you.",
    "- Tone: helpful expert, conversational, concrete. Avoid filler like 'in today's fast-paced world'. Lead with substance.",
  ].join("\n");

  const user = [
    `Title: ${args.title}`,
    `Content cluster: ${args.cluster}`,
    `Meta description (for context): ${args.metaDescription}`,
    "",
    "Section outline (use as your <h2> structure, in order):",
    ...args.outline.map((h, i) => `${i + 1}. ${h}`),
    "",
    "Write the full article body now, plus 4-6 FAQs.",
  ].join("\n");

  const params = {
    model: MODEL,
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: BODY_SCHEMA } },
  } as unknown as Parameters<Awaited<ReturnType<typeof getClient>>["messages"]["stream"]>[0];

  // Stream to avoid HTTP timeouts on the long generation, then take the final message.
  const stream = client.messages.stream(params);
  const res = await stream.finalMessage();
  const parsed = JSON.parse(firstText((res as { content: { type: string; text?: string }[] }).content)) as BodyResult;
  return parsed;
}
