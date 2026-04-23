'use client';

import { useEffect, useState } from 'react';
import { Sparkles, TrendingDown, Check } from 'lucide-react';
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

  const result = calculateBundlePrice(items, rule);
  const count = items.length;
  const savings = result.discount_cents;

  return (
    <div className="space-y-3">
      {/* Encouragement for next tier, if not on one */}
      {count > 0 && !result.applied_tier && result.next_tier && (() => {
        const needed = result.next_tier.qty - count;
        const tierPrice = result.next_tier.price_cents;
        const currentCost = result.subtotal_cents;
        const costAtTier = tierPrice;
        // "Add X more, pay only $Y"
        return (
          <div className="flex items-start gap-2 rounded-lg bg-electric-50 p-3 text-sm text-electric-900">
            <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                Add {needed} more — pay only {formatPrice(costAtTier)}
              </div>
              <div className="text-xs mt-0.5">
                {result.next_tier.qty} items bundle = {formatPrice(tierPrice)}
                {currentCost > costAtTier && ` (save ${formatPrice(currentCost - costAtTier + (needed * (items[0]?.price_cents ?? 399)))} vs individual)`}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bundle hit */}
      {result.applied_tier && (
        <div className="flex items-center gap-2 rounded-lg bg-electric-50 p-3 text-sm font-semibold text-electric-800">
          <Check className="h-4 w-4 shrink-0" />
          <span>
            {count}-item bundle unlocked — saved {formatPrice(savings)}
          </span>
        </div>
      )}

      {/* Tier reference card */}
      {result.available_tiers.length > 0 && (
        <div className="rounded-lg bg-white border border-navy-100 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-navy-500">
            <Sparkles className="h-3 w-3" />
            Bundle savings
          </div>
          <div className="space-y-1.5">
            {result.available_tiers.map((tier) => {
              const isActive = count === tier.qty;
              return (
                <div
                  key={tier.qty}
                  className={
                    'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ' +
                    (isActive
                      ? 'bg-electric-100 text-electric-900 font-bold'
                      : 'text-navy-700')
                  }
                >
                  <span>Any {tier.qty}</span>
                  <span className="font-semibold">{formatPrice(tier.price_cents)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="space-y-1.5 border-t border-navy-100 pt-2">
        {savings > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-navy-600">
              <span>Subtotal ({count} items)</span>
              <span className="line-through">{formatPrice(result.subtotal_cents)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-electric-700">
              <span>Bundle savings</span>
              <span>−{formatPrice(savings)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between text-base font-bold text-navy-900">
          <span>Total</span>
          <span>{formatPrice(result.final_price_cents)}</span>
        </div>
      </div>
    </div>
  );
}
