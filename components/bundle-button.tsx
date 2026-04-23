'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBundleStore } from '@/lib/store/bundle-store';

export function BundleButton() {
  const [mounted, setMounted] = useState(false);
  const count = useBundleStore((s) => s.items.length);
  const toggle = useBundleStore((s) => s.toggle);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      onClick={toggle}
      className="relative flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-bone-50 transition-all hover:bg-navy-800 hover:shadow-card-hover active:scale-95"
    >
      <ShoppingBag className="h-4 w-4" />
      <span className="hidden sm:inline">Bundle</span>
      <AnimatePresence>
        {mounted && count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-electric-400 px-1.5 text-xs font-bold text-navy-900"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
