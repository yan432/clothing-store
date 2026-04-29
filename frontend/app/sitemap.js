import { getApiUrl } from './lib/api'

const BASE_URL = 'https://edmclothes.net'

export default async function sitemap() {
  // Static pages
  const staticPages = [
    { url: BASE_URL,              priority: 1.0,  changeFrequency: 'daily'   },
    { url: `${BASE_URL}/products`, priority: 0.9,  changeFrequency: 'daily'   },
    { url: `${BASE_URL}/contact`,  priority: 0.7,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/shipping`, priority: 0.5,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/returns`,  priority: 0.5,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/faq`,      priority: 0.5,  changeFrequency: 'monthly' },
    { url: `${BASE_URL}/privacy`,  priority: 0.3,  changeFrequency: 'yearly'  },
    { url: `${BASE_URL}/terms`,    priority: 0.3,  changeFrequency: 'yearly'  },
  ]

  // Dynamic product pages
  let productPages = []
  try {
    const res = await fetch(getApiUrl('/products?limit=500'), { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const products = Array.isArray(data) ? data : (data.products || [])
      productPages = products
        .filter(p => !p.is_hidden && p.slug)
        .map(p => ({
          url: `${BASE_URL}/products/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          priority: 0.8,
          changeFrequency: 'weekly',
        }))
    }
  } catch (_) {}

  return [...staticPages, ...productPages]
}
