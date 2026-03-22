import ProductCard from '../components/ProductCard'
import { getApiUrl } from '../lib/api'

export const metadata = {
  title: 'All Products',
  description: 'Browse our full collection.',
  openGraph: {
    title: 'All Products — STORE',
    description: 'Browse our full collection.',
  },
}

async function getProducts() {
  try {
    const apiUrl = getApiUrl('/products')
    const res = await fetch(apiUrl, { cache: 'no-store' })
    if (!res.ok) {
      return { products: [], fetchError: 'Catalog is temporarily unavailable. Please try again in a moment.' }
    }
    const data = await res.json()
    return { products: Array.isArray(data) ? data : [], fetchError: '' }
  } catch {
    return { products: [], fetchError: 'Catalog is temporarily unavailable. Please try again in a moment.' }
  }
}

export default async function ProductsPage({ searchParams }) {
  const { products, fetchError } = await getProducts()
  const params = await searchParams
  const normalizeList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean)
    if (typeof value === 'string' && value) return [value]
    return []
  }

  const q = typeof params?.q === 'string' ? params.q : ''
  const sort = typeof params?.sort === 'string' ? params.sort : 'default'
  const allowedSorts = new Set(['default', 'price_asc', 'price_desc', 'date_asc', 'date_desc', 'popular'])
  const activeSort = allowedSorts.has(sort) ? sort : 'default'
  const selectedCategory = normalizeList(params?.category)[0] || ''
  const selectedSpecials = normalizeList(params?.special)
    .map((v) => String(v).toLowerCase())
    .filter((v) => v === 'new' || v === 'sale')

  const categoriesSet = new Set(products.map((p) => p.category).filter((c) => c && c !== 'All'))
  const categories = Array.from(categoriesSet)
  const specialFilters = [
    { id: 'new', label: 'New' },
    { id: 'sale', label: 'Sale' },
  ]
  const sortOptions = [
    { id: 'default', label: 'Default order' },
    { id: 'popular', label: 'Popularity' },
    { id: 'date_desc', label: 'Newest first' },
    { id: 'date_asc', label: 'Oldest first' },
    { id: 'price_asc', label: 'Price low-high' },
    { id: 'price_desc', label: 'Price high-low' },
  ]

  const filtered = products.filter(p => {
    const tags = Array.isArray(p.tags) ? p.tags : []
    const matchCat = !selectedCategory || p.category === selectedCategory
    const matchSpecial = selectedSpecials.length === 0 || selectedSpecials.some((special) => (
      special === 'new'
        ? tags.includes('new')
        : tags.includes('sale') || (p.compare_price && p.compare_price > p.price)
    ))
    const matchQ = !q
      ? true
      : p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(q.toLowerCase())
    return matchCat && matchSpecial && matchQ
  })

  const getOrderMeta = (product) => {
    const tags = Array.isArray(product.tags) ? product.tags : []
    const priorityTag = tags.find((tag) => String(tag).startsWith('order:priority:'))
    const parsedPriority = priorityTag ? Number(String(priorityTag).split('order:priority:')[1]) : null
    return {
      isFixed: tags.includes('order:fixed'),
      isRandom: tags.includes('order:random'),
      priority: Number.isFinite(parsedPriority) ? parsedPriority : null,
    }
  }

  const randomRanks = new Map(filtered.map((p) => [p.id, Math.random()]))
  const sorted = [...filtered].sort((a, b) => {
    if (activeSort === 'default') {
      const aMeta = getOrderMeta(a)
      const bMeta = getOrderMeta(b)

      const rank = (meta) => meta.isFixed ? 0 : meta.isRandom ? 1 : 2
      const rankDiff = rank(aMeta) - rank(bMeta)
      if (rankDiff !== 0) return rankDiff

      if (aMeta.isFixed && bMeta.isFixed) {
        const aPriority = aMeta.priority ?? Number.MAX_SAFE_INTEGER
        const bPriority = bMeta.priority ?? Number.MAX_SAFE_INTEGER
        if (aPriority !== bPriority) return aPriority - bPriority
      }

      if (aMeta.isRandom && bMeta.isRandom) {
        return (randomRanks.get(a.id) || 0) - (randomRanks.get(b.id) || 0)
      }

      const defaultDateA = Date.parse(a.created_at || '') || 0
      const defaultDateB = Date.parse(b.created_at || '') || 0
      return defaultDateB - defaultDateA || Number(b.id || 0) - Number(a.id || 0)
    }

    if (activeSort === 'price_asc') return Number(a.price || 0) - Number(b.price || 0)
    if (activeSort === 'price_desc') return Number(b.price || 0) - Number(a.price || 0)

    const dateA = Date.parse(a.created_at || '') || 0
    const dateB = Date.parse(b.created_at || '') || 0
    if (activeSort === 'date_asc') return dateA - dateB || Number(a.id || 0) - Number(b.id || 0)
    if (activeSort === 'date_desc') return dateB - dateA || Number(b.id || 0) - Number(a.id || 0)

    // Placeholder for future popularity logic.
    return Number(b.id || 0) - Number(a.id || 0)
  })

  function buildHref(nextQ, nextCategories, nextSpecials, nextSort = activeSort) {
    const sp = new URLSearchParams()
    if (nextQ) sp.set('q', nextQ)
    if (nextSort && nextSort !== 'default') sp.set('sort', nextSort)
    nextCategories.forEach((cat) => sp.append('category', cat))
    nextSpecials.forEach((special) => sp.append('special', special))
    const qs = sp.toString()
    return qs ? `/products?${qs}` : '/products'
  }

  const pageTitle = selectedCategory || 'All Products'
  const categoriesPanelTitle = selectedCategory || 'Categories'
  const activeSortLabel = sortOptions.find((opt) => opt.id === activeSort)?.label || 'Default order'
  const selectedCampaignLabels = specialFilters
    .filter((special) => selectedSpecials.includes(special.id))
    .map((special) => special.label)
  const campaignsTitle = selectedCampaignLabels.length > 0
    ? `Campaigns: ${selectedCampaignLabels.join(', ')}`
    : 'Campaigns'

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
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'EUR',
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>
      <main style={{maxWidth:1200,margin:'0 auto',padding:'48px 24px'}}>
        {fetchError && (
          <div style={{marginBottom:16,border:'1px solid #fecaca',background:'#fef2f2',color:'#b91c1c',borderRadius:10,padding:'10px 12px',fontSize:14}}>
            {fetchError}
          </div>
        )}

        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:32}}>
          <h1 style={{fontSize:28,fontWeight:600,margin:0}}>{pageTitle}</h1>
          <p style={{fontSize:14,color:'#aaa',margin:0}}>{sorted.length} items</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-start">
          <aside className="hidden md:block md:sticky md:top-[88px]">
            <p style={{fontSize:13,color:'#666',margin:'0 0 12px',fontWeight:600}}>{categoriesPanelTitle}</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <a
                href={buildHref(q, [], selectedSpecials, activeSort)}
                style={{
                  fontSize:14,textDecoration:'none',padding:'6px 8px',borderRadius:8,
                  background:!selectedCategory ? '#111' : 'transparent',
                  color:!selectedCategory ? '#fff' : '#333',
                }}>
                All categories
              </a>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat
                const nextCategories = isActive ? [] : [cat]
                return (
                  <a
                    key={cat}
                    href={buildHref(q, nextCategories, selectedSpecials, activeSort)}
                    style={{
                      fontSize:14,textDecoration:'none',padding:'6px 8px',borderRadius:8,
                      background:isActive ? '#111' : 'transparent',
                      color:isActive ? '#fff' : '#333',
                    }}>
                    {cat}
                  </a>
                )
              })}
            </div>
          </aside>

          <section>
            <details className="md:hidden" style={{marginBottom:12}}>
              <summary style={{listStyle:'none',cursor:'pointer',border:'1px solid #222',padding:'10px 14px',fontSize:14,background:'#fff'}}>
                {categoriesPanelTitle}
              </summary>
              <div style={{marginTop:8,border:'1px solid #ddd',padding:8,background:'#fff'}}>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <a
                    href={buildHref(q, [], selectedSpecials, activeSort)}
                    style={{
                      fontSize:14,textDecoration:'none',padding:'6px 8px',borderRadius:8,
                      background:!selectedCategory ? '#111' : 'transparent',
                      color:!selectedCategory ? '#fff' : '#333',
                    }}>
                    All categories
                  </a>
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat
                    const nextCategories = isActive ? [] : [cat]
                    return (
                      <a
                        key={`mobile-${cat}`}
                        href={buildHref(q, nextCategories, selectedSpecials, activeSort)}
                        style={{
                          fontSize:14,textDecoration:'none',padding:'6px 8px',borderRadius:8,
                          background:isActive ? '#111' : 'transparent',
                          color:isActive ? '#fff' : '#333',
                        }}>
                        {cat}
                      </a>
                    )
                  })}
                </div>
              </div>
            </details>

            <form method="get" style={{marginBottom:28}}>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{position:'relative',flex:'1',minWidth:230}}>
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search products..."
                    style={{width:'100%',padding:'11px 16px 11px 40px',borderRadius:10,border:'1px solid #d9d9d6',fontSize:14,outline:'none',background:'#fff',boxSizing:'border-box'}}
                  />
                  <svg style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#aaa'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>

                {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}

                <details name="product-top-filters" style={{position:'relative'}}>
                  <summary style={{listStyle:'none',cursor:'pointer',border:'1px solid #222',borderRadius:0,padding:'10px 14px',fontSize:14,minWidth:150,background:'#fff'}}>
                    Sort: {activeSortLabel}
                  </summary>
                  <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,width:260,border:'1px solid #222',background:'#fff',zIndex:20,padding:10}}>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {sortOptions.map((opt) => (
                        <label key={opt.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                          <input type="radio" name="sort" value={opt.id} defaultChecked={activeSort === opt.id} />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:10}}>
                      <button type="submit" style={{border:'1px solid #111',background:'#111',color:'#fff',padding:'7px 12px',fontSize:12,cursor:'pointer'}}>Apply</button>
                    </div>
                  </div>
                </details>

                <details name="product-top-filters" style={{position:'relative'}}>
                  <summary style={{listStyle:'none',cursor:'pointer',border:'1px solid #222',borderRadius:0,padding:'10px 14px',fontSize:14,minWidth:150,background:'#fff'}}>
                    {campaignsTitle}
                  </summary>
                  <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,width:260,border:'1px solid #222',background:'#fff',zIndex:20,padding:10}}>
                    {activeSort !== 'default' && <input type="hidden" name="sort" value={activeSort} />}
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {specialFilters.map((special) => (
                        <label key={special.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                          <input
                            type="checkbox"
                            name="special"
                            value={special.id}
                            defaultChecked={selectedSpecials.includes(special.id)}
                          />
                          {special.label}
                        </label>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:10}}>
                      <button type="submit" style={{border:'1px solid #111',background:'#111',color:'#fff',padding:'7px 12px',fontSize:12,cursor:'pointer'}}>Apply</button>
                      <a href={buildHref(q, selectedCategory ? [selectedCategory] : [], [], activeSort)} style={{border:'1px solid #ddd',background:'#fff',color:'#333',padding:'7px 12px',fontSize:12,textDecoration:'none'}}>Reset</a>
                    </div>
                  </div>
                </details>

                <button type="submit" style={{border:'1px solid #111',background:'#111',color:'#fff',padding:'10px 14px',fontSize:13,cursor:'pointer'}}>
                  Update
                </button>
                {(q || selectedCategory || selectedSpecials.length > 0 || activeSort !== 'default') && (
                  <a href="/products" style={{fontSize:13,color:'#888',textDecoration:'none',padding:'10px 4px'}}>Clear ×</a>
                )}
              </div>
            </form>

            {sorted.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px 0',color:'#aaa'}}>
            <p style={{fontSize:18,marginBottom:8}}>No products found</p>
            <a href="/products" style={{fontSize:14,color:'#000',textDecoration:'underline'}}>Clear filters</a>
          </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:'48px 24px'}}>
                {sorted.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}