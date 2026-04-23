'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBundleStore } from '@/lib/store/bundle-store';
import { formatPrice } from '@/lib/utils';
import { BundleSummary } from './bundle-summary';

export function BundleDrawer() {
  const isOpen = useBundleStore((s) => s.isOpen);
  const close = useBundleStore((s) => s.close);
  const items = useBundleStore((s) => s.items);
  const remove = useBundleStore((s) => s.remove);
  const clear = useBundleStore((s) => s.clear);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-bone-50 shadow-2xl sm:max-w-md"
          >
            <header className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-navy-900" />
                <h2 className="text-lg font-bold text-navy-900">Your Bundle</h2>
                {items.length > 0 && (
                  <span className="rounded-full bg-electric-100 px-2 py-0.5 text-xs font-bold text-electric-800">
                    {items.length}
                  </span>
                )}
              </div>
              <button
                onClick={close}
                className="rounded-full p-2 text-navy-600 transition-colors hover:bg-navy-100"
                aria-label="Close bundle"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="mb-4 h-12 w-12 text-navy-300" strokeWidth={1.5} />
                  <h3 className="mb-2 text-lg font-bold text-navy-900">Your bundle is empty</h3>
                  <p className="mb-6 text-sm text-navy-600">
                    Browse and add items. Pick 3, 5, or 7 to unlock bundle pricing.
                  </p>
                  <button
                    onClick={close}
                    className="rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-bone-50 hover:bg-navy-800"
                  >
                    Browse products
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.product_id}
                      className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy-50 to-electric-50">
                        {item.preview_image_url ? (
                          <img
                            src={item.preview_image_url}
                            alt=""
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-navy-400">PDF</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-navy-900">{item.title}</p>
                        <p className="text-sm text-navy-600">{formatPrice(item.price_cents)}</p>
                      </div>
                      <button
                        onClick={() => remove(item.product_id)}
                        className="rounded-full p-2 text-navy-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-navy-100 bg-white px-5 py-4">
                <BundleSummary />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={clear}
                    className="rounded-full px-4 py-3 text-sm font-medium text-navy-600 hover:bg-navy-100"
                  >
                    Clear
                  </button>
                  <Link
                    href="/checkout"
                    onClick={close}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-bone-50 transition-all hover:bg-navy-800 hover:shadow-card-hover"
                  >
                    Checkout
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
