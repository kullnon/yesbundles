// lib/blog/engine.ts
// High-level orchestration shared by the editor cron, the writer cron, and the
// seed script. Keeps the DB choreography in one place.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cluster } from "./types";
import { slugify, getAllowedPaths, sanitizeBodyHtml, renderFaqHtml } from "./links";
import { generateOutline, generateBody, generateTopics } from "./writer";
import { REFILL_BATCH, REFILL_BELOW, freshTopics } from "./topics";

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

// ── Planner: keep the queue REFILL_BELOW topics ahead ─────────────────────
export async function refillTopicQueue(admin: SupabaseClient): Promise<{ pending: number; added: string[] }> {
  const { count, error: countErr } = await admin
    .from("blog_topic_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (countErr) throw new Error(`Failed to count pending topics: ${countErr.message}`);
  const pending = count ?? 0;
  if (pending >= REFILL_BELOW) return { pending, added: [] };

  const [{ data: queued, error: qErr }, { data: posts, error: pErr }] = await Promise.all([
    admin.from("blog_topic_queue").select("title"),
    admin.from("blog_posts").select("title"),
  ]);
  if (qErr || pErr) throw new Error(`Failed to read existing titles: ${(qErr ?? pErr)?.message}`);
  const existing = [...(queued ?? []), ...(posts ?? [])].map((r) => r.title as string);

  const ideas = freshTopics(await generateTopics({ count: REFILL_BATCH, existingTitles: existing }), existing);
  if (ideas.length === 0) {
    throw new Error(`Topic queue is low (${pending} pending) and the planner proposed nothing new.`);
  }
  const { error } = await admin
    .from("blog_topic_queue")
    .insert(ideas.map((t) => ({ title: t.title, cluster: t.cluster, priority: 0, source: "auto-refill" })));
  if (error) throw new Error(`Failed to insert refill topics: ${error.message}`);
  return { pending: pending + ideas.length, added: ideas.map((t) => t.title) };
}

// ── Editor: queue/trend → draft row ────────────────────────────────────────
export async function runEditor(admin: SupabaseClient): Promise<{ draftId: string; title: string; slug: string; refilled: string[] }> {
  // Top the queue up first, so it never runs dry again. A failed refill does not
  // stop today's post while topics remain; it is logged, and it is the error if
  // the queue is actually empty.
  let refilled: string[] = [];
  let refillError: string | null = null;
  try {
    refilled = (await refillTopicQueue(admin)).added;
  } catch (e) {
    refillError = e instanceof Error ? e.message : String(e);
    console.error("[blog/editor] topic refill failed:", refillError);
  }

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
    throw new Error(`No pending topics in blog_topic_queue.${refillError ? ` Refill failed: ${refillError}` : ""}`);
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
  return { draftId: inserted.id, title: outline.title, slug, refilled };
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
