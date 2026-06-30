// lib/blog/render.ts
// Presentation helpers for rendering a post body — specifically injecting the
// mid-article CTA. The end-of-article CTA is a React component; this injects a
// single styled CTA block before the middle <h2> so the post has one mid + one
// end CTA, as specced. The injected HTML is template-controlled (not AI).

import { CLUSTERS } from "./clusters";
import type { Cluster } from "./types";

function midCtaHtml(cluster: Cluster): string {
  const { cta } = CLUSTERS[cluster];
  return [
    '<div class="my-8 rounded-2xl border border-electric-200 bg-electric-50 p-5">',
    `<p class="text-sm font-semibold text-navy-900">${cta.product}</p>`,
    `<p class="mt-1 text-sm text-navy-600">${cta.blurb}</p>`,
    `<a href="${cta.href}" class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-bone-50 no-underline hover:bg-navy-800">${cta.linkText} →</a>`,
    "</div>",
  ].join("");
}

/**
 * Inject the mid-article CTA before the middle <h2>. Falls back to no injection
 * if there are too few sections.
 */
export function withMidCta(bodyHtml: string, cluster: Cluster): string {
  const indices: number[] = [];
  const re = /<h2[\s>]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyHtml)) !== null) indices.push(m.index);

  // Need at least 3 sections to place a CTA in the middle without it landing
  // at the very top or bottom.
  if (indices.length < 3) return bodyHtml;
  const target = indices[Math.floor(indices.length / 2)];
  return bodyHtml.slice(0, target) + midCtaHtml(cluster) + bodyHtml.slice(target);
}
