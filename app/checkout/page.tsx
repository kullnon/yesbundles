'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, CreditCard } from 'lucide-react';
import { useBundleStore } from '@/lib/store/bundle-store';
import { BundleSummary } from '@/components/bundle-summary';

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const items = useBundleStore((s) => s.items);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse text-navy-600">Loading your bundle…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Keep shopping
      </Link>

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
        Checkout
      </h1>
      <p className="mb-8 text-navy-600">Review your bundle before payment.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="mb-4 text-navy-700">Your bundle is empty.</p>
          <Link
            href="/"
            className="inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-bone-50 hover:bg-navy-800"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <ul className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
              {items.map((item) => (
                <li
                  key={item.product_id}
                  className="flex items-center justify-between border-b border-navy-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="font-medium text-navy-900">{item.title}</span>
                  <span className="text-navy-600">
                    ${(item.price_cents / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-2xl bg-white p-5 shadow-card h-fit">
            <BundleSummary />

            <button
              disabled
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-navy-400 px-5 py-3 text-sm font-semibold text-bone-50 cursor-not-allowed"
            >
              <CreditCard className="h-4 w-4" />
              Pay with Card
            </button>

            <div className="mt-4 rounded-lg bg-electric-50 p-3 text-xs text-electric-800">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <Lock className="h-3.5 w-3.5" />
                Coming in Phase 4
              </div>
              Stripe checkout, account creation, and instant download delivery will be wired up in the next build phase.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
