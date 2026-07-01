import { getApiUrl } from './lib/api'
import { DEFAULT_LOCALE, UK_LOCALE, pathForLocale } from './lib/i18n'
import { absoluteLanguageAlternates, absoluteUrl } from './lib/seo'
import { COLLECTION_SLUGS, collectionPath } from './lib/collections'

// Approximate last-modified dates for static pages
const STATIC_PAGES = [
  { path: '/',           priority: 1.0, changeFrequency: 'daily',   lastModified: new Date('2026-05-26') },
  { path: '/products',   priority: 0.9, changeFrequency: 'daily',   lastModified: new Date('2026-05-26') },
  { path: '/women',      priority: 0.8, changeFrequency: 'daily',   lastModified: new Date('2026-07-01') },
  { path: '/men',        priority: 0.8, changeFrequency: 'daily',   lastModified: new Date('2026-07-01') },
  { path: '/brands',     priority: 0.8, changeFrequency: 'daily',   lastModified: new Date('2026-07-01') },
  { path: '/about',      priority: 0.8, changeFrequency: 'monthly', lastModified: new Date('2026-05-26') },
  { path: '/contact',    priority: 0.7, changeFrequency: 'monthly', lastModified: new Date('2026-05-26') },
  { path: '/shipping',   priority: 0.5, changeFrequency: 'monthly', lastModified: new Date('2026-05-26') },
  { path: '/returns',    priority: 0.5, changeFrequency: 'monthly', lastModified: new Date('2026-05-26') },
  { path: '/faq',        priority: 0.5, changeFrequency: 'monthly', lastModified: new Date('2026-05-26') },
  { path: '/size-guide', priority: 0.4, changeFrequency: 'monthly', lastModified: new Date('2026-05-26') },
  { path: '/privacy',    priority: 0.3, changeFrequency: 'yearly',  lastModified: new Date('2026-05-26') },
  { path: '/terms',      priority: 0.3, changeFrequency: 'yearly',  lastModified: new Date('2026-05-26') },
  { path: '/imprint',    priority: 0.2, changeFrequency: 'yearly',  lastModified: new Date('2026-05-26') },
]

const COLLECTION_PAGES = COLLECTION_SLUGS.map(slug => ({
  path: collectionPath(slug),
  priority: slug === 'new' ? 0.8 : 0.7,
  changeFrequency: 'weekly',
  lastModified: new Date('2026-06-05'),
}))

function sitemapEntry({ path, locale, images, ...entry }) {
  return {
    ...entry,
    url: absoluteUrl(pathForLocale(path, locale)),
    alternates: {
      languages: absoluteLanguageAlternates(path),
    },
    ...(images?.length ? { images } : {}),
  }
}

export default async function sitemap() {
  let productPages = []

  try {
    const res = await fetch(getApiUrl('/products?limit=500'), { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const products = Array.isArray(data) ? data : (data.products || [])
      productPages = products
        .filter(p => !p.is_hidden && p.slug && !(p.name || '').startsWith('[ARCHIVED]'))
        .flatMap(p => {
          // Next.js 16 sitemap expects images as string[], not { url, title }
          const rawUrls = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls : p.image_url ? [p.image_url] : []
          const images = rawUrls.slice(0, 5).map(u => (typeof u === 'string' ? u : String(u?.url ?? u))).filter(u => u.startsWith('http'))
          const isNew = Array.isArray(p.tags) && p.tags.includes('new')
          const entry = {
            path: `/products/${p.slug}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
            priority: isNew ? 0.9 : 0.8,
            changeFrequency: 'weekly',
            images,
          }
          return [DEFAULT_LOCALE, UK_LOCALE].map(locale => sitemapEntry({ ...entry, locale }))
        })
    }
  } catch (_) {}

  const staticPages = STATIC_PAGES.flatMap(page =>
    [DEFAULT_LOCALE, UK_LOCALE].map(locale => sitemapEntry({ ...page, locale })),
  )

  const collectionPages = COLLECTION_PAGES.flatMap(page =>
    [DEFAULT_LOCALE, UK_LOCALE].map(locale => sitemapEntry({ ...page, locale })),
  )

  return [...staticPages, ...collectionPages, ...productPages]
}
