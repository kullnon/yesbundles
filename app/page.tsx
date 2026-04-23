import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product-card';
import { CategoryFilter } from '@/components/category-filter';
import type { Product, Category } from '@/lib/types/product';

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const supabase = await createClient();

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const categories = (categoriesData ?? []) as Category[];

  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category) {
    const cat = categories.find((c) => c.slug === category);
    if (cat) query = query.eq('category_id', cat.id);
  }

  const { data: productsData, error } = await query;
  const products = (productsData ?? []) as Product[];

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

      <section className="mb-8">
        <CategoryFilter categories={categories} />
      </section>

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

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </section>
    </div>
  );
}
