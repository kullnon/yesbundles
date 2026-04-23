import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — YesBundles',
  description: 'YesBundles is a digital marketplace by Maestro Media Group, offering hand-crafted templates, trackers, and guides.',
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
        About <span className="text-electric-600">YesBundles</span>
      </h1>

      <div className="space-y-6 text-lg text-navy-700 leading-relaxed">
        <p>
          YesBundles is a digital marketplace for hand-crafted templates, trackers, and guides.
          Pick the ones you need, bundle them together, and save automatically.
        </p>

        <p>
          Every product is made to solve a real problem, across five areas that matter:
          <strong> Work, Money, and Life</strong>.
        </p>

        <p>
          We believe in delivering real value, not fluff. No subscriptions, no upsells,
          no hidden fees. You pick, you pay, you download. Lifetime access on every product.
        </p>

        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card">
          <h2 className="mb-2 text-lg font-bold text-navy-900">Built by Maestro Media Group</h2>
          <p className="text-base text-navy-600">
            YesBundles is a platform from Maestro Media Group, a digital agency building
            software, content, and media platforms for small businesses and creators.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-bone-50 transition-all hover:bg-navy-800 hover:shadow-card-hover"
          >
            Browse products
          </Link>
        </div>
      </div>
    </article>
  );
}
