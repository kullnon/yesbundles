'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import type { Product } from '@/lib/types/product';
import { formatPrice } from '@/lib/utils';
import { AddToBundleButton } from './add-to-bundle-button';

type Props = {
  product: Product;
  index?: number;
};

export function ProductCard({ product, index = 0 }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
    >
      <Link href={`/p/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-navy-50 to-electric-50">
          {product.preview_url ? (
            <img
              src={product.preview_url}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileText className="h-16 w-16 text-navy-300" strokeWidth={1.5} />
            </div>
          )}
          {product.category && (
            <span className="absolute left-3 top-3 rounded-full bg-bone-50/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-navy-700 backdrop-blur-sm">
              {product.category.name}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/p/${product.slug}`}>
          <h3 className="mb-1 font-bold text-navy-900 line-clamp-2 group-hover:text-electric-600 transition-colors">
            {product.title}
          </h3>
        </Link>
        {product.tagline && (
          <p className="mb-3 text-sm text-navy-600 line-clamp-2">
            {product.tagline}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-xl font-bold text-navy-900">
            {formatPrice(product.price_cents)}
          </span>
          <AddToBundleButton product={product} size="sm" />
        </div>
      </div>
    </motion.article>
  );
}
