// Offline check of the topic-queue dedupe (lib/blog/topics.ts) against the 13
// titles the queue really holds. No network, no database.
//
//   npx tsx scripts/topics-selftest.ts

import assert from "node:assert/strict";

import { freshTopics, overlaps } from "../lib/blog/topics";

const EXISTING = [
  "Should you ever share your current salary with a recruiter?",
  "5 salary negotiation mistakes that cost engineers $10K+",
  "How to negotiate a raise when you have not changed jobs",
  "How much should you counter-offer? A 2026 guide",
  "Debt snowball vs debt avalanche: which pays off faster?",
  "How big should your emergency fund actually be?",
  "Are 0% APR balance transfers a trap or a tool?",
  "How to pay off $20,000 in credit card debt without bankruptcy",
  "Sinking funds explained: budgeting for irregular expenses",
  "How much can you really make on Uber Eats in 2026?",
  "Turning a weekend skill into $500/month: a realistic plan",
  "Top 7 side hustles that actually pay in 2026",
  "Etsy vs Shopify for first-time sellers in 2026",
];

// Rewordings of existing posts are caught.
assert.ok(overlaps("Debt avalanche vs debt snowball: which pays off faster", EXISTING[4]));
assert.ok(overlaps("How big should an emergency fund be in 2027?", EXISTING[5]));
assert.ok(overlaps("Etsy or Shopify for first time sellers", EXISTING[12]));
// Genuinely different questions on the same theme are not.
assert.ok(!overlaps("Sinking fund vs emergency fund: what goes where", EXISTING[8]));
assert.ok(!overlaps("When does Etsy deposit your money?", EXISTING[12]));

const kept = freshTopics(
  [
    { title: "Debt avalanche vs debt snowball: which pays off faster", cluster: "finance" },
    { title: "Sinking fund vs emergency fund: what goes where", cluster: "finance" },
    { title: "Sinking fund vs emergency fund — what goes where?", cluster: "finance" },
    { title: "How to ask for a promotion without a title change on offer", cluster: "career" },
    { title: "Best crypto coins to buy now", cluster: "crypto" },
    { title: "   ", cluster: "career" },
    { title: "When does Etsy deposit your money?", cluster: "side_hustle" },
  ],
  EXISTING,
);
assert.deepEqual(kept.map((t) => t.title), [
  "Sinking fund vs emergency fund: what goes where",
  "How to ask for a promotion without a title change on offer",
  "When does Etsy deposit your money?",
]);

console.log("topics selftest: all passed");
