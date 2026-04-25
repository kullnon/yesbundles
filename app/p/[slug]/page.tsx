import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, Download, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';
import { AddToBundleButton } from '@/components/add-to-bundle-button';
import type { Product } from '@/lib/types/product';
import type { Metadata } from 'next';

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select("title, description")
    .eq('slug', slug)
    .maybeSingle();

  if (!data) return { title: 'Product not found — YesBundles' };

  return {
    title: `${data.title} — YesBundles`,
    description: data.description ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: productData } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!productData) notFound();
  const product = productData as Product;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-navy-50 to-electric-50 shadow-card">
          {product.preview_image_url ? (
            <img
              src={product.preview_image_url}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileText className="h-24 w-24 text-navy-300" strokeWidth={1.5} />
            </div>
          )}
          {product.category && (
            <span className="absolute left-4 top-4 rounded-full bg-bone-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-navy-700 backdrop-blur-sm">
              {product.category.name}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            {product.title}
          </h1>

          <div className="mb-6 flex flex-wrap gap-4 text-sm text-navy-600">
            {product.page_count && (
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> {product.page_count} pages
              </span>
            )}
            {product.file_size_mb && (
              <span className="flex items-center gap-1.5">
                <Download className="h-4 w-4" /> {product.file_size_mb} MB
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Lifetime access
            </span>
          </div>

          {product.description && (
            <div className="mb-8 whitespace-pre-line text-navy-700">
              {product.description}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-card">
            <span className="text-3xl font-bold text-navy-900">
              {formatPrice(product.price_cents)}
            </span>
            <AddToBundleButton product={product} size="md" />
          </div>
        </div>
      </div>
    </div>
  );
}
