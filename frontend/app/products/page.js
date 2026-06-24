import ProductCard from '../components/ProductCard'
import ProductSearchTracker from '../components/ProductSearchTracker'
import SortSelect from './SortSelect'
import Link from 'next/link'
import { getApiUrl } from '../lib/api'
import { safeJsonLd } from '../lib/safeJsonLd'
import { getMessages, localizeProduct, pathForLocale, translateCategory } from '../lib/i18n'
import { localizedAlternates } from '../lib/seo'
import { getUahRate, currencyForLocale, priceForLocale } from '../lib/money'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Accessories', 'Knitwear', 'Denim', 'Jackets']
const SEO_PRODUCTS_TITLE = 'Shop Ukrainian Streetwear, Hoodies & Denim'
const SEO_PRODUCTS_DESCRIPTION = 'Explore edm.clothes: oversized hoodies, deconstructed denim, longsleeves and bottoms made in Ukraine. Worldwide shipping.'

function usefulMeta(value, fallback, minLength = 60) {
  const text = String(value || '').trim()
  return text.length >= minLength ? text : fallback
}

function stableRandomRank(product) {
  const input = String(product?.id ?? product?.slug ?? product?.name ?? '')
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

export async function generateMetadata() {
  try {
    const res = await fetch(getApiUrl('/settings'), { next: { revalidate: 300 } })
    const s = res.ok ? await res.json() : {}
    return {
      title: usefulMeta(s.seo_products_title, SEO_PRODUCTS_TITLE, 10),
      description: usefulMeta(s.seo_products_description, SEO_PRODUCTS_DESCRIPTION),
      alternates: localizedAlternates('/products'),
    }
  } catch {
    return { title: SEO_PRODUCTS_TITLE, description: SEO_PRODUCTS_DESCRIPTION, alternates: localizedAlternates('/products') }
  }
}

async function getProducts() {
  try {
    const res = await fetch(getApiUrl('/products'), { next: { revalidate: 300 } })
    if (!res.ok) return { products: [], fetchError: 'Catalog is temporarily unavailable.' }
    const data = await res.json()
    return { products: Array.isArray(data) ? data : [], fetchError: '' }
  } catch {
    return { products: [], fetchError: 'Catalog is temporarily unavailable.' }
  }
}

function buildColorSiblingsMap(products) {
  const groups = {}
  for (const p of products) {
    if (!p.color_group_id) continue
    if (!groups[p.color_group_id]) groups[p.color_group_id] = []
    const db_urls = Array.isArray(p.image_urls) ? p.image_urls : []
    groups[p.color_group_id].push({
      id: p.id,
      slug: p.slug || String(p.id),
      color_name: p.color_name,
      color_hex: p.color_hex,
      image_url: p.image_url,
      image_urls: db_urls,
      hover_image_url: db_urls[1] || p.image_url,
      in_stock: (p.available_stock ?? p.stock ?? 0) > 0,
    })
  }
  const map = {}
  for (const [, members] of Object.entries(groups)) {
    for (const m of members) map[m.id] = members.filter(s => s.id !== m.id)
  }
  return map
}

export default async function ProductsPage({ searchParams, locale = 'en' }) {
  const d = getMessages(locale)
  const { products, fetchError } = await getProducts()
  const colorSiblingsMap = buildColorSiblingsMap(products)
  const uahRate = locale === 'uk' ? await getUahRate() : undefined
  const currency = currencyForLocale(locale)
  const params = await searchParams

  const normalizeList = (v) => Array.isArray(v) ? v.filter(Boolean) : typeof v === 'string' && v ? [v] : []

  const q                = typeof params?.q === 'string' ? params.q : ''
  const sort             = typeof params?.sort === 'string' ? params.sort : 'default'
  const allowedSorts     = new Set(['default', 'price_asc', 'price_desc', 'date_asc', 'date_desc', 'popular'])
  const activeSort       = allowedSorts.has(sort) ? sort : 'default'
  const selectedCategory = normalizeList(params?.category)[0] || ''
  const selectedSpecials = normalizeList(params?.special)
    .map(v => String(v).toLowerCase())
    .filter(v => v === 'new' || v === 'sale')

  const categories = Array.from(new Set(products.map(p => p.category).filter(c => c && c !== 'All')))
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })

  const sortOptions = [
    { id: 'default',    label: d.products.defaultOrder },
    { id: 'popular',    label: d.products.popularity },
    { id: 'date_desc',  label: d.products.newestFirst },
    { id: 'date_asc',   label: d.products.oldestFirst },
    { id: 'price_asc',  label: d.products.priceLowHigh },
    { id: 'price_desc', label: d.products.priceHighLow },
  ]

  const filtered = products.filter(p => {
    const displayProduct = localizeProduct(p, locale)
    const tags = Array.isArray(p.tags) ? p.tags : []
    const matchCat     = !selectedCategory || p.category === selectedCategory
    const matchSpecial = selectedSpecials.length === 0 || selectedSpecials.some(s =>
      s === 'new' ? tags.includes('new') : tags.includes('sale') || (p.compare_price && p.compare_price > p.price)
    )
    const matchQ = !q || displayProduct.name.toLowerCase().includes(q.toLowerCase()) || (displayProduct.description || '').toLowerCase().includes(q.toLowerCase())
    return matchCat && matchSpecial && matchQ
  })

  const getOrderMeta = p => {
    const tags = Array.isArray(p.tags) ? p.tags : []
    const pt = tags.find(t => String(t).startsWith('order:priority:'))
    return {
      isFixed:  tags.includes('order:fixed'),
      isRandom: tags.includes('order:random'),
      priority: pt ? Number(String(pt).split('order:priority:')[1]) : null,
    }
  }
  const randomRanks = new Map(filtered.map(p => [p.id, stableRandomRank(p)]))
  const sorted = [...filtered].sort((a, b) => {
    if (activeSort === 'default') {
      const am = getOrderMeta(a), bm = getOrderMeta(b)
      const rank = m => m.isFixed ? 0 : m.isRandom ? 1 : 2
      const rd = rank(am) - rank(bm)
      if (rd !== 0) return rd
      if (am.isFixed && bm.isFixed) {
        const ap = am.priority ?? Number.MAX_SAFE_INTEGER
        const bp = bm.priority ?? Number.MAX_SAFE_INTEGER
        if (ap !== bp) return ap - bp
      }
      if (am.isRandom && bm.isRandom) return (randomRanks.get(a.id) || 0) - (randomRanks.get(b.id) || 0)
      return (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0) || Number(b.id || 0) - Number(a.id || 0)
    }
    if (activeSort === 'price_asc')  return Number(a.price || 0) - Number(b.price || 0)
    if (activeSort === 'price_desc') return Number(b.price || 0) - Number(a.price || 0)
    const da = Date.parse(a.created_at || '') || 0, db = Date.parse(b.created_at || '') || 0
    if (activeSort === 'date_asc')  return da - db || Number(a.id || 0) - Number(b.id || 0)
    if (activeSort === 'date_desc') return db - da || Number(b.id || 0) - Number(a.id || 0)
    return Number(b.id || 0) - Number(a.id || 0)
  })

  function buildHref(nextQ, nextCat, nextSpecials, nextSort = activeSort) {
    const sp = new URLSearchParams()
    if (nextQ) sp.set('q', nextQ)
    if (nextSort && nextSort !== 'default') sp.set('sort', nextSort)
    if (nextCat) sp.append('category', nextCat)
    nextSpecials.forEach(s => sp.append('special', s))
    const qs = sp.toString()
    return pathForLocale(qs ? `/products?${qs}` : '/products', locale)
  }

  const hasActiveFilters = q || selectedCategory || selectedSpecials.length > 0 || activeSort !== 'default'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: d.products.allProducts,
    numberOfItems: sorted.length,
    itemListElement: sorted.map((p, i) => {
      const displayProduct = localizeProduct(p, locale)
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: displayProduct.name,
          image: p.image_url,
          offers: { '@type': 'Offer', price: priceForLocale(p, locale, uahRate), priceCurrency: currency },
        },
      }
    }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}/>
      <ProductSearchTracker search={q} resultCount={sorted.length} />
      <main className="products-main" style={{ maxWidth: 1440, margin: '0 auto', padding: '38px 24px 64px' }}>

        {fetchError && (
          <div style={{ marginBottom: 16, border: '1px solid #f02a2a', background: '#fff', color: '#b91c1c', borderRadius: 0, padding: '10px 14px', fontSize: 14 }}>
            {fetchError ? d.products.catalogUnavailable : ''}
          </div>
        )}

        {/* Title row */}
        <div className="products-header-row" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: 0, textTransform: 'uppercase' }}>
            {selectedCategory ? translateCategory(selectedCategory, locale) : d.products.allProducts}
          </h1>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{sorted.length} {d.products.items}</span>
        </div>

        {/* Filter bar: desktop = single row, mobile = search + scrollable pills */}
        <div className="products-filter-bar">

          {/* Search */}
          <form method="get" className="products-search-form">
            {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
            {selectedSpecials.map(s => <input key={s} type="hidden" name="special" value={s} />)}
            {activeSort !== 'default' && <input type="hidden" name="sort" value={activeSort} />}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input name="q" defaultValue={q} placeholder={d.products.search}
                style={{ padding: '9px 14px 9px 34px', borderRadius: 0, border: '1px solid #0a0a0a', fontSize: 12, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              />
            </div>
          </form>

          {/* Pills — scrollable on mobile */}
          <div className="products-pills">
            <a href={buildHref(q, '', selectedSpecials)} style={{
              padding: '9px 14px', borderRadius: 0, fontSize: 11, fontWeight: 800,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: !selectedCategory ? '#111' : 'transparent',
              color: !selectedCategory ? '#fff' : '#111',
              border: '1px solid', borderColor: !selectedCategory ? '#111' : '#bdbdb8',
            }}>{translateCategory('All', locale)}</a>

            {categories.map(cat => {
              const isActive = selectedCategory === cat
              return (
                <a key={cat} href={buildHref(q, isActive ? '' : cat, selectedSpecials)} style={{
                  padding: '9px 14px', borderRadius: 0, fontSize: 11, fontWeight: 800,
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: isActive ? '#111' : 'transparent',
                  color: isActive ? '#fff' : '#111',
                  border: '1px solid', borderColor: isActive ? '#111' : '#bdbdb8',
                }}>{translateCategory(cat, locale)}</a>
              )
            })}

            <div style={{ width: 1, height: 30, background: '#111', margin: '0 2px', flexShrink: 0 }} />

            {['new', 'sale'].map(special => {
              const isActive = selectedSpecials.includes(special)
              const nextSpecials = isActive ? selectedSpecials.filter(s => s !== special) : [...selectedSpecials, special]
              return (
                <a key={special} href={buildHref(q, selectedCategory, nextSpecials)} style={{
                  padding: '9px 13px', borderRadius: 0, fontSize: 11, fontWeight: 900,
                  textDecoration: 'none', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                  background: isActive ? (special === 'sale' ? '#f02a2a' : '#111') : 'transparent',
                  color: isActive ? '#fff' : '#111',
                  border: '1px solid', borderColor: isActive ? (special === 'sale' ? '#f02a2a' : '#111') : '#bdbdb8',
                }}>{special === 'new' ? d.nav.newArrivals : d.nav.sale}</a>
              )
            })}
          </div>

          {/* Sort + Clear */}
          <div className="products-sort-group">
            {hasActiveFilters && (
              <Link href={pathForLocale('/products', locale)} style={{ fontSize: 11, color: '#555', textDecoration: 'underline', whiteSpace: 'nowrap', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{d.products.clear}</Link>
            )}
            <SortSelect options={sortOptions} activeSort={activeSort} hiddenFields={{ q, category: selectedCategory, special: selectedSpecials }} locale={locale} />
          </div>

        </div>

        {/* Product grid */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>{d.products.noProducts}</p>
            <Link href={pathForLocale('/products', locale)} style={{ fontSize: 14, color: '#000', textDecoration: 'underline' }}>{d.products.clearFilters}</Link>
          </div>
        ) : (
          <div className="products-grid">
            {sorted.map((product, index) => (
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
