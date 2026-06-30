// lib/blog/engine.ts
// High-level orchestration shared by the editor cron, the writer cron, and the
// seed script. Keeps the DB choreography in one place.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cluster } from "./types";
import { slugify, getAllowedPaths, sanitizeBodyHtml, renderFaqHtml } from "./links";
import { generateOutline, generateBody } from "./writer";

const OUTLINE_MARKER = "<!--OUTLINE:";

// finance/career → Maya; side_hustle → Marcus.
async function pickAuthorId(admin: SupabaseClient, cluster: Cluster): Promise<string | null> {
  const slug = cluster === "side_hustle" ? "marcus-webb" : "maya-chen";
  const { data } = await admin.from("blog_authors").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

async function ensureUniqueSlug(admin: SupabaseClient, base: string): Promise<string> {
  let slug = base || "post";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data } = await admin
      .from("blog_posts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

function encodeOutline(outline: string[]): string {
  return `${OUTLINE_MARKER}${JSON.stringify(outline)}-->`;
}

function decodeOutline(bodyHtml: string | null): string[] {
  if (!bodyHtml) return [];
  const m = bodyHtml.match(/<!--OUTLINE:([\s\S]*?)-->/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1]);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ── Editor: queue/trend → draft row ────────────────────────────────────────
export async function runEditor(admin: SupabaseClient): Promise<{ draftId: string; title: string; slug: string }> {
  // Pull the highest-priority pending topic.
  const { data: topic } = await admin
    .from("blog_topic_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!topic) {
    throw new Error("No pending topics in blog_topic_queue.");
  }

  // Claim it so concurrent runs don't double-pick.
  await admin.from("blog_topic_queue").update({ status: "in_progress" }).eq("id", topic.id);

  const cluster = topic.cluster as Cluster;
  const outline = await generateOutline({ title: topic.title, cluster });
  const slug = await ensureUniqueSlug(admin, slugify(outline.title));
  const authorId = await pickAuthorId(admin, cluster);

  const { data: inserted, error } = await admin
    .from("blog_posts")
    .insert({
      slug,
      title: outline.title,
      meta_description: outline.metaDescription,
      body_html: encodeOutline(outline.outline),
      cluster,
      author_id: authorId,
      status: "draft",
      tags: [cluster],
    })
    .select("id")
    .single();

  if (error || !inserted) {
    // Release the topic back to pending so it can be retried.
    await admin.from("blog_topic_queue").update({ status: "pending" }).eq("id", topic.id);
    throw new Error(`Failed to insert draft: ${error?.message}`);
  }

  await admin.from("blog_topic_queue").update({ status: "done" }).eq("id", topic.id);
  return { draftId: inserted.id, title: outline.title, slug };
}

// ── Writer: oldest draft → published post ──────────────────────────────────
export async function runWriter(admin: SupabaseClient): Promise<{ postId: string; slug: string; title: string }> {
  const { data: draft } = await admin
    .from("blog_posts")
    .select("*")
    .eq("status", "draft")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!draft) {
    throw new Error("No drafts awaiting the writer.");
  }

  const cluster = draft.cluster as Cluster;
  const outline = decodeOutline(draft.body_html);
  const allowedPaths = await getAllowedPaths(admin);

  const { bodyHtml, faqs } = await generateBody({
    title: draft.title,
    cluster,
    outline,
    metaDescription: draft.meta_description ?? "",
    allowedPaths,
  });

  const cleanBody = sanitizeBodyHtml(bodyHtml, allowedPaths);
  const faqHtml = renderFaqHtml(faqs);
  const finalHtml = faqHtml ? `${cleanBody}\n${faqHtml}` : cleanBody;
  const now = new Date().toISOString();

  const { error } = await admin
    .from("blog_posts")
    .update({
      body_html: finalHtml,
      faqs,
      status: "published",
      published_at: now,
      updated_at: now,
    })
    .eq("id", draft.id);

  if (error) {
    throw new Error(`Failed to publish post: ${error.message}`);
  }

  return { postId: draft.id, slug: draft.slug, title: draft.title };
}

// ── Seed: one-shot full pipeline → published post (no queue/draft dance) ────
export async function createSeedPost(
  admin: SupabaseClient,
  topic: { title: string; cluster: Cluster }
): Promise<{ slug: string; title: string }> {
  const outline = await generateOutline(topic);
  const allowedPaths = await getAllowedPaths(admin);
  const { bodyHtml, faqs } = await generateBody({
    title: outline.title,
    cluster: topic.cluster,
    outline: outline.outline,
    metaDescription: outline.metaDescription,
    allowedPaths,
  });

  const cleanBody = sanitizeBodyHtml(bodyHtml, allowedPaths);
  const faqHtml = renderFaqHtml(faqs);
  const finalHtml = faqHtml ? `${cleanBody}\n${faqHtml}` : cleanBody;
  const slug = await ensureUniqueSlug(admin, slugify(outline.title));
  const authorId = await pickAuthorId(admin, topic.cluster);
  const now = new Date().toISOString();

  const { error } = await admin.from("blog_posts").insert({
    slug,
    title: outline.title,
    meta_description: outline.metaDescription,
    body_html: finalHtml,
    faqs,
    cluster: topic.cluster,
    author_id: authorId,
    status: "published",
    tags: [topic.cluster],
    published_at: now,
  });

  if (error) {
    throw new Error(`Failed to insert seed post "${topic.title}": ${error.message}`);
  }
  return { slug, title: outline.title };
}
