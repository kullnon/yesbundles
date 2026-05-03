import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()
  
  // Fetch all products
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true)

  const productUrls = (products || []).map((product) => ({
    url: `https://www.yesbundles.com/p/${product.slug}`,
    lastModified: product.updated_at || new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://www.yesbundles.com',
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://www.yesbundles.com/account',
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    ...productUrls,
  ]
}
