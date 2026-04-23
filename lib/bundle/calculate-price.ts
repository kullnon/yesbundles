import type { BundleRule, BundleItem, BundleTier } from '@/lib/types/product';

export type PriceResult = {
  subtotal_cents: number;
  discount_cents: number;
  final_price_cents: number;
  applied_tier: BundleTier | null; // null when count doesn't hit an exact tier
  next_tier: BundleTier | null;    // nearest tier above current count (encouragement)
  available_tiers: BundleTier[];   // all tiers sorted ascending by qty
};

/**
 * YesBundles pricing:
 * - Per-item price applies unless bundle tier qty matches exactly (3, 5, 7).
 * - Matching a tier flat-rates the bundle to the tier price.
 * - Non-matching counts (1, 2, 4, 6, 8+) pay straight subtotal at per-item price.
 */
export function calculateBundlePrice(
  items: BundleItem[],
  rule: BundleRule | null
): PriceResult {
  const subtotal = items.reduce((acc, i) => acc + i.price_cents, 0);
  const count = items.length;

  const tiers =
    rule && rule.is_active && rule.rule_type === 'tiered_flat'
      ? [...(rule.config.tiers ?? [])].sort((a, b) => a.qty - b.qty)
      : [];

  const applied = tiers.find((t) => t.qty === count) ?? null;
  const next = tiers.find((t) => t.qty > count) ?? null;

  const final = applied ? applied.price_cents : subtotal;

  return {
    subtotal_cents: subtotal,
    discount_cents: applied ? Math.max(0, subtotal - applied.price_cents) : 0,
    final_price_cents: final,
    applied_tier: applied,
    next_tier: next,
    available_tiers: tiers,
  };
}
