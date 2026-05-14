import { getApiUrl } from './lib/api'

const BASE_URL = 'https://www.edmclothes.net'

// Approximate last-modified dates for static pages
const STATIC_PAGES = [
  { url: BASE_URL,                 priority: 1.0, changeFrequency: 'daily',   lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/products`,   priority: 0.9, changeFrequency: 'daily',   lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/contact`,    priority: 0.7, changeFrequency: 'monthly', lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/shipping`,   priority: 0.5, changeFrequency: 'monthly', lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/returns`,    priority: 0.5, changeFrequency: 'monthly', lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/faq`,        priority: 0.5, changeFrequency: 'monthly', lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/size-guide`, priority: 0.4, changeFrequency: 'monthly', lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/privacy`,    priority: 0.3, changeFrequency: 'yearly',  lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/terms`,      priority: 0.3, changeFrequency: 'yearly',  lastModified: new Date('2025-01-01') },
  { url: `${BASE_URL}/imprint`,    priority: 0.2, changeFrequency: 'yearly',  lastModified: new Date('2025-01-01') },
]

export default async function sitemap() {
  let productPages = []

  try {
    const res = await fetch(getApiUrl('/products?limit=500'), { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const products = Array.isArray(data) ? data : (data.products || [])
      productPages = products
        .filter(p => !p.is_hidden && p.slug && !(p.name || '').startsWith('[ARCHIVED]'))
        .map(p => {
          // Next.js 16 sitemap expects images as string[], not { url, title }
          const rawUrls = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls : p.image_url ? [p.image_url] : []
          const images = rawUrls.slice(0, 5).map(u => (typeof u === 'string' ? u : String(u?.url ?? u))).filter(u => u.startsWith('http'))
          const isNew = Array.isArray(p.tags) && p.tags.includes('new')
          return {
            url: `${BASE_URL}/products/${p.slug}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
            priority: isNew ? 0.9 : 0.8,
            changeFrequency: 'weekly',
            ...(images.length > 0 && { images }),
          }
        })
    }
  } catch (_) {}

  return [...STATIC_PAGES, ...productPages]
}
