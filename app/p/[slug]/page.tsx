import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/product-detail'
import type { Metadata } from 'next'

type Props = {
  params: { slug: string }
}

async function getProduct(slug: string) {
  const supabase = createClient()
  const { data: product } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  return product
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug)
  
  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  const price = (product.price_cents / 100).toFixed(2)
  const description = product.description || `Download ${product.name} for $${price}. High-quality digital product from YesBundles.`

  return {
    title: `${product.name} - $${price} | YesBundles`,
    description: description.slice(0, 160), // Google's limit
    openGraph: {
      title: product.name,
      description: description.slice(0, 160),
      type: 'website',
      url: `https://www.yesbundles.com/p/${product.slug}`,
      siteName: 'YesBundles',
      images: [
        {
          url: product.preview_url || 'https://www.yesbundles.com/og-default.png',
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: description.slice(0, 160),
      images: [product.preview_url || 'https://www.yesbundles.com/og-default.png'],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.slug)

  if (!product) {
    notFound()
  }

  return <ProductDetail product={product} />
}
