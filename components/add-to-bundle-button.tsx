'use client';

import { useEffect, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBundleStore } from '@/lib/store/bundle-store';
import type { Product } from '@/lib/types/product';
import { cn } from '@/lib/utils';

type Props = {
  product: Product;
  size?: 'sm' | 'md';
  className?: string;
};

export function AddToBundleButton({ product, size = 'md', className }: Props) {
  const [mounted, setMounted] = useState(false);
  const inBundle = useBundleStore((s) => s.has(product.id));
  const add = useBundleStore((s) => s.add);
  const remove = useBundleStore((s) => s.remove);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inBundle) {
      remove(product.id);
    } else {
      add({
        product_id: product.id,
        slug: product.slug,
        title: product.title,
        price_cents: product.price_cents,
        preview_image_url: product.preview_image_url,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 600);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'h-9 px-3 text-xs'
    : 'h-10 px-4 text-sm';

  const showInBundle = mounted && inBundle;

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      animate={justAdded ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors',
        sizeClasses,
        showInBundle
          ? 'bg-electric-400 text-navy-900 hover:bg-electric-300'
          : 'bg-navy-900 text-bone-50 hover:bg-navy-800',
        className
      )}
    >
      {showInBundle ? (
        <>
          <Check className="h-4 w-4" />
          <span>In Bundle</span>
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </>
      )}
    </motion.button>
  );
}
