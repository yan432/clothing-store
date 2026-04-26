import ProductCard from '../components/ProductCard'
import SortSelect from './SortSelect'
import { getApiUrl } from '../lib/api'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Accessories', 'Knitwear', 'Denim', 'Jackets']

export async function generateMetadata() {
  try {
    const res = await fetch(getApiUrl('/settings'), { next: { revalidate: 300 } })
    const s = res.ok ? await res.json() : {}
    return {
      title: s.seo_products_title || 'Shop',
      description: s.seo_products_description || 'Browse our full collection.',
    }
  } catch {
    return { title: 'Shop', description: 'Browse our full collection.' }
  }
}

async function getProducts() {
  try {
    const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
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

export default async function ProductsPage({ searchParams }) {
  const { products, fetchError } = await getProducts()
  const colorSiblingsMap = buildColorSiblingsMap(products)
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
    { id: 'default',    label: 'Default order' },
    { id: 'popular',    label: 'Popularity' },
    { id: 'date_desc',  label: 'Newest first' },
    { id: 'date_asc',   label: 'Oldest first' },
    { id: 'price_asc',  label: 'Price: low → high' },
    { id: 'price_desc', label: 'Price: high → low' },
  ]

  const filtered = products.filter(p => {
    const tags = Array.isArray(p.tags) ? p.tags : []
    const matchCat     = !selectedCategory || p.category === selectedCategory
    const matchSpecial = selectedSpecials.length === 0 || selectedSpecials.some(s =>
      s === 'new' ? tags.includes('new') : tags.includes('sale') || (p.compare_price && p.compare_price > p.price)
    )
    const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.description || '').toLowerCase().includes(q.toLowerCase())
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
  const randomRanks = new Map(filtered.map(p => [p.id, Math.random()]))
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
    return qs ? `/products?${qs}` : '/products'
  }

  const activeSortLabel = sortOptions.find(o => o.id === activeSort)?.label || 'Default order'
  const hasActiveFilters = q || selectedCategory || selectedSpecials.length > 0 || activeSort !== 'default'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'All Products',
    numberOfItems: sorted.length,
    itemListElement: sorted.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        image: p.image_url,
        offers: { '@type': 'Offer', price: p.price, priceCurrency: 'EUR' },
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 28px' }}>

        {fetchError && (
          <div style={{ marginBottom: 16, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 14 }}>
            {fetchError}
          </div>
        )}

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            {selectedCategory || 'All Products'}
          </h1>
          <span style={{ fontSize: 13, color: '#aaa' }}>{sorted.length} items</span>
        </div>

        {/* Single filter row: search (desktop-left) + pills + sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>

          {/* Search — desktop: order -1 (leftmost), mobile: order 10 (below pills) */}
          <form method="get" className="products-search-form">
            {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
            {selectedSpecials.map(s => <input key={s} type="hidden" name="special" value={s} />)}
            {activeSort !== 'default' && <input type="hidden" name="sort" value={activeSort} />}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input name="q" defaultValue={q} placeholder="Search…"
                style={{ padding: '7px 14px 7px 34px', borderRadius: 999, border: '1.5px solid #e0e0de', fontSize: 13, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </form>

          {/* All */}
          <a href={buildHref(q, '', selectedSpecials)}
            style={{
              padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', whiteSpace: 'nowrap',
              background: !selectedCategory ? '#111' : 'transparent',
              color: !selectedCategory ? '#fff' : '#555',
              border: '1.5px solid',
              borderColor: !selectedCategory ? '#111' : '#e0e0de',
            }}>
            All
          </a>

          {categories.map(cat => {
            const isActive = selectedCategory === cat
            return (
              <a key={cat}
                href={buildHref(q, isActive ? '' : cat, selectedSpecials)}
                style={{
                  padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  background: isActive ? '#111' : 'transparent',
                  color: isActive ? '#fff' : '#555',
                  border: '1.5px solid',
                  borderColor: isActive ? '#111' : '#e0e0de',
                }}>
                {cat}
              </a>
            )
          })}

          {/* Divider before specials */}
          <div style={{ width: 1, height: 22, background: '#e0e0de', margin: '0 2px', flexShrink: 0 }} />

          {/* New / Sale */}
          {['new', 'sale'].map(special => {
            const isActive = selectedSpecials.includes(special)
            const nextSpecials = isActive ? selectedSpecials.filter(s => s !== special) : [...selectedSpecials, special]
            return (
              <a key={special}
                href={buildHref(q, selectedCategory, nextSpecials)}
                style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  textDecoration: 'none', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: isActive ? (special === 'sale' ? '#ef4444' : '#111') : 'transparent',
                  color: isActive ? '#fff' : '#888',
                  border: '1.5px solid',
                  borderColor: isActive ? (special === 'sale' ? '#ef4444' : '#111') : '#e0e0de',
                }}>
                {special}
              </a>
            )
          })}

          {/* spacer */}
          <div style={{ flex: 1, minWidth: 8 }} />

          {/* Clear */}
          {hasActiveFilters && (
            <a href="/products" style={{ fontSize: 13, color: '#aaa', textDecoration: 'none', whiteSpace: 'nowrap' }}>Clear ×</a>
          )}

          {/* Sort */}
          <SortSelect
            options={sortOptions}
            activeSort={activeSort}
            hiddenFields={{ q, category: selectedCategory, special: selectedSpecials }}
          />
        </div>

        {/* Product grid */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>No products found</p>
            <a href="/products" style={{ fontSize: 14, color: '#000', textDecoration: 'underline' }}>Clear filters</a>
          </div>
        ) : (
          <div className="products-grid">
            {sorted.map(product => (
              <ProductCard key={product.id} product={product} colorSiblings={colorSiblingsMap[product.id] || []} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
