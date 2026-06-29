import Link from 'next/link';
import { TrendingDown, ArrowRight, Sparkles } from 'lucide-react';
import { APP_ROUTE, APP_NAME, APP_PRICE_CENTS } from '@/lib/apps/debt-escape/config';

// Homepage spotlight for the YesBundles Pro mini-apps. Currently surfaces the
// one shipped app (Debt Escape Simulator). Uses the same card language as
// ProductCard — rounded-2xl, shadow-card, hover lift, navy/electric gradient.
export function ProApps() {
  const price = `$${APP_PRICE_CENTS / 100}`;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">Pro Apps</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-electric-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-700">
          <Sparkles className="h-3 w-3" />
          New
        </span>
      </div>

      <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover sm:flex-row">
        {/* Visual panel — mirrors the ProductCard gradient image area */}
        <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-navy-50 to-electric-50 sm:aspect-auto sm:w-2/5 sm:max-w-xs">
          <TrendingDown className="h-20 w-20 text-electric-500" strokeWidth={1.5} />
          <span className="absolute left-3 top-3 rounded-full bg-bone-50/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy-700 backdrop-blur-sm">
            Finance
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="mb-1 text-lg font-bold text-navy-900 transition-colors group-hover:text-electric-600 sm:text-xl">
            {APP_NAME}
          </h3>
          <p className="mb-4 max-w-md text-sm text-navy-600 sm:text-base">
            Compare Snowball vs Avalanche, side by side — see your debt-free date,
            total interest, and how much faster you escape with a little extra.
          </p>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xl font-bold text-navy-900">
              {price}
              <span className="ml-1 text-xs font-medium text-navy-500">one-time</span>
            </span>
            <Link
              href={APP_ROUTE}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-bone-50 transition hover:bg-navy-800"
            >
              Open the simulator
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
