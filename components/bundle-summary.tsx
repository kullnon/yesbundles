'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useBundleStore } from '@/lib/store/bundle-store';
import { createClient } from '@/lib/supabase/client';
import { calculateBundlePrice } from '@/lib/bundle/calculate-price';
import { formatPrice } from '@/lib/utils';
import type { BundleRule } from '@/lib/types/product';

export function BundleSummary() {
  const items = useBundleStore((s) => s.items);
  const [rule, setRule] = useState<BundleRule | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('bundle_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRule(data as BundleRule);
      });
  }, []);

  const subtotal = items.reduce((acc, i) => acc + i.price_cents, 0);
  const result = calculateBundlePrice(items, rule);
  const final = result?.final_price_cents ?? subtotal;
  const savings = subtotal - final;

  // Compute the next tier message
  let nextTierMsg: string | null = null;
  if (rule && rule.discount_type === 'flat_tiered' && rule.tiers) {
    const sorted = [...rule.tiers].sort((a, b) => a.min_items - b.min_items);
    const next = sorted.find((t) => items.length < t.min_items);
    if (next) {
      const diff = next.min_items - items.length;
      const flatPrice = next.price_cents ? `$${(next.price_cents / 100).toFixed(0)}` : '';
      nextTierMsg = `Add ${diff} more ${diff === 1 ? 'item' : 'items'} to save with the ${flatPrice} bundle`;
    }
  }

  const maxTier = rule?.tiers ? Math.max(...rule.tiers.map((t) => t.min_items)) : 1;
  const progress = Math.min((items.length / maxTier) * 100, 100);

  return (
    <div className="space-y-3">
      {nextTierMsg && (
        <div className="rounded-lg bg-electric-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-electric-800">
            <Sparkles className="h-3.5 w-3.5" />
            {nextTierMsg}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-electric-100">
            <div
              className="h-full rounded-full bg-electric-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-navy-600">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {savings > 0 && (
          <div className="flex items-center justify-between text-sm font-semibold text-electric-700">
            <span>Bundle savings</span>
            <span>−{formatPrice(savings)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-navy-100 pt-1.5 text-base font-bold text-navy-900">
          <span>Total</span>
          <span>{formatPrice(final)}</span>
        </div>
      </div>
    </div>
  );
}
