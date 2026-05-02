import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product-card';
import { CategoryFilter } from '@/components/category-filter';
import type { Product, Category } from '@/lib/types/product';

export const revalidate = 60;

// Bonus product copy — kept in sync with the bundle drawer + webhook.
// If you change the threshold here, change it in:
//   - components/bundle-drawer.tsx (BONUS_THRESHOLD)
//   - app/api/webhook/stripe/route.ts (BONUS_THRESHOLD)
const BONUS_THRESHOLD = 7;
const BONUS_TITLE = 'The Passive Income Engine';

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: productsData, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const allProducts = (productsData ?? []) as Product[];

  const stockedCategoryIds = new Set(
    allProducts.map((p) => p.category_id).filter(Boolean)
  );

  const { data: featuredData } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(4);

  const featuredProducts = (featuredData ?? []) as Product[];

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const categories = ((categoriesData ?? []) as Category[]).filter((c) =>
    stockedCategoryIds.has(c.id)
  );

  const activeCategory = category
    ? categories.find((c) => c.slug === category)
    : null;

  const products = activeCategory
    ? allProducts.filter((p) => p.category_id === activeCategory.id)
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-10 max-w-3xl">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
          Build your own <span className="text-electric-600">bundle</span>.
        </h1>
        <p className="text-lg text-navy-600">
          Hand-crafted templates, trackers, and guides. Add 3+ to your bundle and save automatically.
        </p>
      </section>

      {/* Bonus banner — sits between hero and category filter */}
      <section className="mb-8">
        <div className="flex items-start gap-3 rounded-2xl border border-electric-200 bg-gradient-to-r from-electric-50 to-bone-50 px-5 py-4 sm:items-center">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-electric-100 text-xl"
          >
            🎁
          </span>
          <div className="text-sm leading-snug sm:text-base">
            <p className="font-bold text-navy-900">
              Bundle {BONUS_THRESHOLD} items, get {BONUS_TITLE} free.
            </p>
            <p className="mt-0.5 text-navy-700">
              Reach {BONUS_THRESHOLD}{" "}items in a single order and we&apos;ll add the bonus
              guide to your downloads at no extra cost.
            </p>
          </div>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-navy-900 sm:text-2xl">Featured</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {featuredProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <CategoryFilter categories={categories} activeSlug={category ?? null} />
      </section>

      {activeCategory && (
        <>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
              Error loading products: {error.message}
            </div>
          )}

          {!error && products.length === 0 && (
            <div className="rounded-xl bg-bone-100 p-8 text-center text-navy-600">
              No products in this category yet.
            </div>
          )}

          <section id="products" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
