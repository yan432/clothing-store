import ProductCard from '../../components/ProductCard'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getApiUrl } from '../../lib/api'
import { getMessages, localizeProduct, pathForLocale } from '../../lib/i18n'
import { safeJsonLd } from '../../lib/safeJsonLd'
import { absoluteUrl, localizedAlternates, openGraphLocale } from '../../lib/seo'
import { getUahRate } from '../../lib/money'
import { COLLECTION_SLUGS, collectionCopy, collectionPath, getCollection } from '../../lib/collections'
import { getPublicBrands, getRankingSeed, stableRandomRank, withPreviewBrands } from '../../lib/marketplacePreview'

async function getProducts() {
  try {
    const res = await fetch(getApiUrl('/products?scope=marketplace&limit=500'), { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function buildColorSiblingsMap(products) {
  const groups = {}
  for (const p of products) {
    if (!p.color_group_id) continue
    if (!groups[p.color_group_id]) groups[p.color_group_id] = []
    const imageUrls = Array.isArray(p.image_urls) ? p.image_urls : []
    groups[p.color_group_id].push({
      id: p.id,
      slug: p.slug || String(p.id),
      color_name: p.color_name,
      color_hex: p.color_hex,
      image_url: p.image_url,
      image_urls: imageUrls,
      hover_image_url: imageUrls[1] || p.image_url,
      in_stock: (p.available_stock ?? p.stock ?? 0) > 0,
    })
  }
  const map = {}
  for (const members of Object.values(groups)) {
    for (const m of members) map[m.id] = members.filter(s => s.id !== m.id)
  }
  return map
}

function matchesCollection(product, collection) {
  const tags = Array.isArray(product.tags) ? product.tags : []
  const filter = collection.filter || {}
  if (filter.category && product.category !== filter.category) return false
  if (filter.tag && !tags.includes(filter.tag)) return false
  if (filter.sale && !(tags.includes('sale') || (product.compare_price && product.compare_price > product.price))) return false
  return true
}

function orderProducts(products, seed = '') {
  const randomRanks = new Map(products.map(p => [p.id, stableRandomRank(p, seed)]))
  const getOrderMeta = p => {
    const tags = Array.isArray(p.tags) ? p.tags : []
    const priorityTag = tags.find(t => String(t).startsWith('order:priority:'))
    return {
      isFixed: tags.includes('order:fixed'),
      isRandom: tags.includes('order:random'),
      priority: priorityTag ? Number(String(priorityTag).split('order:priority:')[1]) : null,
    }
  }

  return [...products].sort((a, b) => {
    const am = getOrderMeta(a), bm = getOrderMeta(b)
    const rank = m => m.isFixed ? 0 : m.isRandom ? 1 : 2
    const rankDiff = rank(am) - rank(bm)
    if (rankDiff !== 0) return rankDiff
    if (am.isFixed && bm.isFixed) {
      const ap = am.priority ?? Number.MAX_SAFE_INTEGER
      const bp = bm.priority ?? Number.MAX_SAFE_INTEGER
      if (ap !== bp) return ap - bp
    }
    if (am.isRandom && bm.isRandom) return (randomRanks.get(a.id) || 0) - (randomRanks.get(b.id) || 0)
    const sd = (Number(b.popularity_score) || 0) - (Number(a.popularity_score) || 0)
    if (sd !== 0) return sd
    return (randomRanks.get(a.id) || 0) - (randomRanks.get(b.id) || 0)
  })
}

export function generateStaticParams() {
  return COLLECTION_SLUGS.map(slug => ({ slug }))
}

export async function generateMetadata({ params, locale = 'en' }) {
  const { slug } = await params
  const collection = getCollection(slug)
  if (!collection) notFound()
  const copy = collectionCopy(collection, locale)
  const path = collectionPath(collection.slug)

  return {
    title: copy.title,
    description: copy.description,
    alternates: localizedAlternates(path, locale),
    openGraph: {
      title: copy.metaTitle,
      description: copy.description,
      locale: openGraphLocale(locale),
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: copy.metaTitle,
      description: copy.description,
    },
  }
}

export default async function CollectionPage({ params, searchParams, locale = 'en' }) {
  const { slug } = await params
  const currentParams = await (searchParams || {})
  const collection = getCollection(slug)
  if (!collection) notFound()

  const d = getMessages(locale)
  const copy = collectionCopy(collection, locale)
  const normalizeList = value => Array.isArray(value) ? value.filter(Boolean).map(String) : typeof value === 'string' && value ? [value] : []
  const selectedBrands = normalizeList(currentParams?.brand)
  const [allProducts, rawBrands, seed] = await Promise.all([getProducts(), getPublicBrands(), getRankingSeed()])
  const products = allProducts
    .filter(p => !p.is_hidden && p.slug && !(p.name || '').startsWith('[ARCHIVED]'))
  const brands = withPreviewBrands(rawBrands, products)
  const colorSiblingsMap = buildColorSiblingsMap(products)
  const visibleProducts = orderProducts(products.filter(product => {
    const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(String(product.brand_id || ''))
    return matchesCollection(product, collection) && matchBrand
  }), seed)
  const uahRate = locale === 'uk' ? await getUahRate() : undefined
  const pagePath = collectionPath(collection.slug)
  const hasActiveFilters = selectedBrands.length > 0

  function buildHref(nextBrands = selectedBrands) {
    const sp = new URLSearchParams()
    nextBrands.forEach(brand => sp.append('brand', brand))
    const qs = sp.toString()
    return pathForLocale(qs ? `${pagePath}?${qs}` : pagePath, locale)
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: copy.title,
    numberOfItems: visibleProducts.length,
    itemListElement: visibleProducts.map((product, index) => {
      const displayProduct = localizeProduct(product, locale)
      return {
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(pathForLocale(`/products/${product.slug}`, locale)),
        item: {
          '@type': 'Product',
          name: displayProduct.name,
          image: product.image_url,
          category: product.category,
          brand: { '@type': 'Brand', name: 'edm.clothes' },
        },
      }
    }),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: d.product.breadcrumbHome, item: absoluteUrl(pathForLocale('/', locale)) },
      { '@type': 'ListItem', position: 2, name: d.product.breadcrumbShop, item: absoluteUrl(pathForLocale('/products', locale)) },
      { '@type': 'ListItem', position: 3, name: copy.title, item: absoluteUrl(pathForLocale(pagePath, locale)) },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <main className="products-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 28px' }}>
        <div style={{ maxWidth: 760, marginBottom: 34 }}>
          <Link href={pathForLocale('/products', locale)} style={{ fontSize: 13, color: '#8a8a84', textDecoration: 'none', display: 'inline-block', marginBottom: 18 }}>
            {d.product.back}
          </Link>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            {copy.title}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#5f5f58', margin: 0 }}>
            {copy.intro}
          </p>
        </div>

        <div className="products-header-row" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            {copy.navLabel || copy.title}
          </h2>
          <span style={{ fontSize: 13, color: '#aaa' }}>{visibleProducts.length} {d.products.items}</span>
        </div>

        <div className="products-filter-bar">
          <div className="products-pills">
            {brands.map(brand => {
              const brandId = String(brand.id)
              const isActive = selectedBrands.includes(brandId)
              const nextBrands = isActive ? selectedBrands.filter(id => id !== brandId) : [...selectedBrands, brandId]
              return (
                <Link key={brand.id} href={buildHref(nextBrands)} style={{
                  padding: '9px 13px', borderRadius: 0, fontSize: 11, fontWeight: 900,
                  textDecoration: 'none', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                  background: isActive ? '#111' : 'transparent',
                  color: isActive ? '#fff' : '#111',
                  border: '1px solid', borderColor: isActive ? '#111' : '#bdbdb8',
                }}>{brand.name}</Link>
              )
            })}
          </div>
          {hasActiveFilters && (
            <Link href={pathForLocale(pagePath, locale)} style={{ fontSize: 11, color: '#555', textDecoration: 'underline', whiteSpace: 'nowrap', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{d.products.clear}</Link>
          )}
        </div>

        {visibleProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 0', color: '#aaa' }}>
            <p style={{ fontSize: 16, margin: '0 0 12px' }}>{d.products.noProducts}</p>
            <Link href={pathForLocale('/products', locale)} style={{ fontSize: 14, color: '#000', textDecoration: 'underline' }}>{d.products.clearFilters}</Link>
          </div>
        ) : (
          <div className="products-grid">
            {visibleProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                colorSiblings={colorSiblingsMap[product.id] || []}
                imagePriority={index < 2}
                locale={locale}
                uahRate={uahRate}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
