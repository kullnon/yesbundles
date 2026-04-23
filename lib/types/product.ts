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

export type BundleRule = {
  id: string;
  name: string;
  is_active: boolean;
  discount_type: 'flat_tiered' | 'percent';
  tiers: Array<{ min_items: number; price_cents?: number; percent_off?: number }>;
  priority: number;
};

export type BundleItem = {
  product_id: string;
  slug: string;
  title: string;
  price_cents: number;
  preview_image_url: string | null;
};
