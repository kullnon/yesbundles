// lib/blog/topics.ts
// Keeps blog_topic_queue from running dry. The 13 seed topics were all used by
// 2026-07-02 and the editor then crashed every day for four months on an empty
// queue. Now the editor tops the queue up before it picks: when fewer than
// REFILL_BELOW topics are pending, it asks the planner for REFILL_BATCH more and
// keeps only titles that are genuinely new. Pure of Next and Supabase so the
// dedupe can be tested on its own.

import type { Cluster } from "./types";

export const REFILL_BELOW = 25;
export const REFILL_BATCH = 10;
export const CLUSTERS: Cluster[] = ["finance", "career", "side_hustle"];

const STOP = new Set(["a", "an", "the", "to", "of", "for", "and", "or", "in", "on", "your", "you", "is", "are", "how", "what", "why", "should", "do", "does", "can", "with", "vs", "versus", "it", "really", "actually"]);

/** Content words of a title, lowercased, years and punctuation dropped: what makes two titles the same post. */
export function titleKey(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/\b(19|20)\d\d\b/g, " ")
    .replace(/[^a-z0-9$%]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map((w) => w.replace(/(ies|es|s)$/, (m) => (m === "ies" ? "y" : "")));
}

/** Two titles overlap when most of the shorter one's content words are in the other. */
export function overlaps(a: string, b: string): boolean {
  const ka = new Set(titleKey(a));
  const kb = new Set(titleKey(b));
  if (ka.size === 0 || kb.size === 0) return false;
  const [small, big] = ka.size <= kb.size ? [ka, kb] : [kb, ka];
  let shared = 0;
  for (const w of Array.from(small)) if (big.has(w)) shared++;
  return shared / small.size >= 0.75;
}

/** Ideas that are new against `existing` and against each other, with a valid cluster. */
export function freshTopics<T extends { title: string; cluster: string }>(ideas: T[], existing: string[]): T[] {
  const kept: T[] = [];
  for (const idea of ideas) {
    const title = idea.title?.trim();
    if (!title || title.length > 120 || !CLUSTERS.includes(idea.cluster as Cluster)) continue;
    if (existing.some((e) => overlaps(e, title)) || kept.some((k) => overlaps(k.title, title))) continue;
    kept.push({ ...idea, title });
  }
  return kept;
}
