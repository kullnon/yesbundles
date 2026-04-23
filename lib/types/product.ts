export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  group_name: string | null;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  price_cents: number;
  category_id: string;
  category?: Category;
  preview_image_url: string | null;
  file_path: string | null;
  file_size_mb: number | null;
  page_count: number | null;
  is_active: boolean;
  created_at: string;
};

export type BundleTier = {
  qty: number;
  price_cents: number;
};

export type BundleRuleConfig = {
  tiers?: BundleTier[];
  min_qty?: number;
  discount_percent?: number;
};

export type BundleRule = {
  id: string;
  name: string;
  rule_type: 'tiered_flat' | 'percentage_off';
  config: BundleRuleConfig;
  is_active: boolean;
  priority: number;
};

export type BundleItem = {
  product_id: string;
  slug: string;
  title: string;
  price_cents: number;
  preview_image_url: string | null;
};
