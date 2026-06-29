import Link from 'next/link';
import { TrendingDown, Briefcase, ArrowRight, Sparkles } from 'lucide-react';
import {
  APP_ROUTE as DEBT_ROUTE,
  APP_NAME as DEBT_NAME,
  APP_PRICE_CENTS as DEBT_PRICE,
} from '@/lib/apps/debt-escape/config';
import {
  APP_ROUTE as SALARY_ROUTE,
  APP_NAME as SALARY_NAME,
  APP_PRICE_CENTS as SALARY_PRICE,
} from '@/lib/apps/salary-negotiation/config';

// Homepage spotlight for the YesBundles Pro mini-apps. Uses the same card
// language as ProductCard — rounded-2xl, shadow-card, hover lift, gradient
// visual panel + category badge. Responsive: 2 columns on desktop, stacked
// on mobile.
const APPS = [
  {
    route: DEBT_ROUTE,
    name: DEBT_NAME,
    priceCents: DEBT_PRICE,
    category: 'Finance',
    blurb:
      'Compare Snowball vs Avalanche, side by side — see your debt-free date and how much faster you escape with a little extra.',
    cta: 'Open the simulator',
    Icon: TrendingDown,
  },
  {
    route: SALARY_ROUTE,
    name: SALARY_NAME,
    priceCents: SALARY_PRICE,
    category: 'Career',
    blurb:
      'See how your offer compares to market, then get an AI counter-offer script, email reply, and rebuttals to every pushback.',
    cta: 'Open the coach',
    Icon: Briefcase,
  },
];

export function ProApps() {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-navy-900 sm:text-2xl">Pro Apps</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-electric-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-700">
          <Sparkles className="h-3 w-3" />
          New
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {APPS.map(({ route, name, priceCents, category, blurb, cta, Icon }) => (
          <article
            key={route}
            className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
          >
            {/* Visual panel — mirrors the ProductCard gradient image area */}
            <div className="relative flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-navy-50 to-electric-50">
              <Icon className="h-16 w-16 text-electric-500" strokeWidth={1.5} />
              <span className="absolute left-3 top-3 rounded-full bg-bone-50/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy-700 backdrop-blur-sm">
                {category}
              </span>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-5">
              <h3 className="mb-1 text-lg font-bold text-navy-900 transition-colors group-hover:text-electric-600">
                {name}
              </h3>
              <p className="mb-4 text-sm text-navy-600">{blurb}</p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xl font-bold text-navy-900">
                  ${priceCents / 100}
                  <span className="ml-1 text-xs font-medium text-navy-500">one-time</span>
                </span>
                <Link
                  href={route}
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-bone-50 transition hover:bg-navy-800"
                >
                  {cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
