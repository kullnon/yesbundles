import type { BundleRule, BundleItem } from '@/lib/types/product';

export type PriceResult = {
  subtotal_cents: number;
  discount_cents: number;
  final_price_cents: number;
  applied_tier?: { min_items: number; price_cents?: number; percent_off?: number };
};

/**
 * Given a list of items in the bundle and the active rule,
 * compute subtotal, discount, and final price in cents.
 *
 * Supports:
 * - flat_tiered: pick the highest tier whose min_items <= items.length, use its flat price
 * - percent:     pick the highest tier whose min_items <= items.length, apply percent_off to subtotal
 */
export function calculateBundlePrice(
  items: BundleItem[],
  rule: BundleRule | null
): PriceResult | null {
  const subtotal = items.reduce((acc, i) => acc + i.price_cents, 0);

  if (!rule || !rule.is_active || items.length === 0) {
    return {
      subtotal_cents: subtotal,
      discount_cents: 0,
      final_price_cents: subtotal,
    };
  }

  const sortedTiers = [...(rule.tiers ?? [])].sort(
    (a, b) => b.min_items - a.min_items
  );
  const applied = sortedTiers.find((t) => items.length >= t.min_items);

  if (!applied) {
    return {
      subtotal_cents: subtotal,
      discount_cents: 0,
      final_price_cents: subtotal,
    };
  }

  let final = subtotal;

  if (rule.discount_type === 'flat_tiered' && applied.price_cents !== undefined) {
    final = applied.price_cents;
  } else if (rule.discount_type === 'percent' && applied.percent_off !== undefined) {
    final = Math.round(subtotal * (1 - applied.percent_off / 100));
  }

  // Don't let "discount" make it more expensive
  if (final > subtotal) final = subtotal;

  return {
    subtotal_cents: subtotal,
    discount_cents: subtotal - final,
    final_price_cents: final,
    applied_tier: applied,
  };
}
