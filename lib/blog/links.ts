// lib/blog/links.ts
// Internal-link allowlist + HTML sanitization for the blog engine.
//
// ⚠️ HAZARD (PawSignal post-mortem):
//  1. Use sanitize-html — NOT isomorphic-dompurify (it crashes in Vercel prod
//     due to ESM bundling).
//  2. The AI invents internal links like /blog/some-post that 404. We pass it an
//     explicit allowlist AND defensively strip any anchor whose href isn't on
//     that allowlist here (belt and suspenders).

import sanitizeHtml from "sanitize-html";
import type { SupabaseClient } from "@supabase/supabase-js";

// Static internal targets the AI may link to.
const STATIC_ALLOWED = ["/apps/debt-escape", "/apps/salary-negotiation", "/products"];

const stripTrailingSlash = (s: string) =>
  s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Build the allowlist of internal paths the writer may link to:
 * the static app/products pages plus every active PDF product at /p/<slug>.
 */
export async function getAllowedPaths(admin: SupabaseClient): Promise<string[]> {
  const { data } = await admin
    .from("products")
    .select("slug")
    .eq("is_active", true);
  const productPaths = (data ?? []).map((p: { slug: string }) => `/p/${p.slug}`);
  return [...STATIC_ALLOWED, ...productPaths];
}

/** Human-readable allowlist block for the writer prompt. */
export function allowlistForPrompt(paths: string[]): string {
  return paths.map((p) => `- ${p}`).join("\n");
}

/**
 * Sanitize AI-generated article HTML:
 * - strips scripts/styles/iframes and dangerous attributes (sanitize-html)
 * - keeps a blog-appropriate tag set
 * - drops any anchor whose href is not on the internal allowlist (the link is
 *   unwrapped to its text so the prose survives but the bad URL is gone)
 */
export function sanitizeBodyHtml(html: string, allowedPaths: string[]): string {
  const allowed = new Set(allowedPaths.map(stripTrailingSlash));
  return sanitizeHtml(html, {
    allowedTags: [
      "h2", "h3", "h4", "p", "ul", "ol", "li", "a", "strong", "em", "b", "i",
      "blockquote", "br", "hr", "table", "thead", "tbody", "tr", "th", "td",
      "code", "pre", "span",
    ],
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    // No external schemes beyond http(s)/relative; no data: URIs.
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = stripTrailingSlash((attribs.href ?? "").trim());
        if (href.startsWith("/") && allowed.has(href)) {
          return {
            tagName: "a",
            attribs: { href, rel: "noopener" },
          };
        }
        // Fabricated internal link or any external link → unwrap to text.
        return { tagName: "span", attribs: {} };
      },
    },
  });
}

/** Render the FAQ section HTML from structured Q&As (kept in sync with JSON-LD). */
export function renderFaqHtml(faqs: { question: string; answer: string }[]): string {
  if (!faqs.length) return "";
  const items = faqs
    .map(
      (f) =>
        `<h3>${escapeHtml(f.question)}</h3>\n<p>${escapeHtml(f.answer)}</p>`
    )
    .join("\n");
  return `<h2>Frequently asked questions</h2>\n${items}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
