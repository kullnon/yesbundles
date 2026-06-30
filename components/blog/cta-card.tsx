import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CLUSTERS } from "@/lib/blog/clusters";
import type { Cluster } from "@/lib/blog/types";

// End-of-article contextual CTA. The product is chosen by the post's cluster.
// This is the "this does what the post explained — try it free" card, rendered
// by the template (never written inline by the AI).
export function CtaCard({ cluster }: { cluster: Cluster }) {
  const { cta } = CLUSTERS[cluster];
  return (
    <aside className="mt-10 overflow-hidden rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-900 to-navy-800 p-6 text-bone-50 shadow-card">
      <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-electric-300">
        <Sparkles className="h-3.5 w-3.5" />
        {cta.product}
      </div>
      <p className="max-w-xl text-lg font-semibold leading-snug">{cta.blurb}</p>
      <Link
        href={cta.href}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-electric-500 px-5 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-electric-400"
      >
        {cta.linkText}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </aside>
  );
}
