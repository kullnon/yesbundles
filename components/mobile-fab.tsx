'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBundleStore } from '@/lib/store/bundle-store';

export function MobileFAB() {
  const [mounted, setMounted] = useState(false);
  const count = useBundleStore((s) => s.items.length);
  const isOpen = useBundleStore((s) => s.isOpen);
  const open = useBundleStore((s) => s.open);

  useEffect(() => {
    setMounted(true);
  }, []);

  const show = mounted && count > 0 && !isOpen;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={open}
          className="fixed bottom-5 right-5 z-30 flex h-14 items-center gap-2 rounded-full bg-navy-900 px-5 text-bone-50 shadow-card-hover sm:hidden animate-pulse-soft"
          aria-label={`Open bundle (${count} items)`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-sm font-bold">View Bundle</span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-electric-400 px-1.5 text-xs font-bold text-navy-900">
            {count}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
