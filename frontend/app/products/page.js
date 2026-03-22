import ProductCard from '../components/ProductCard'

export const metadata = {
  title: 'All Products',
  description: 'Browse our full collection.',
  openGraph: {
    title: 'All Products — STORE',
    description: 'Browse our full collection.',
  },
}

async function getProducts() {
  const res = await fetch('https://clothing-store-production-983f.up.railway.app/products', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default async function ProductsPage({ searchParams }) {
  const products = await getProducts()
  const { q, category } = await searchParams

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]

  const filtered = products.filter(p => {
    const matchCat = !category || category === 'All' || p.category === category
    const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(q.toLowerCase())
    return matchCat && matchQ
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'All Products',
    numberOfItems: filtered.length,
    itemListElement: filtered.map((p, i) => ({
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

        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:32}}>
          <h1 style={{fontSize:28,fontWeight:600,margin:0}}>All Products</h1>
          <p style={{fontSize:14,color:'#aaa',margin:0}}>{filtered.length} items</p>
        </div>

        {/* Search + Filters */}
        <form method="get" style={{marginBottom:36}}>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{position:'relative',flex:'1',minWidth:200}}>
              <input
                name="q"
                defaultValue={q || ''}
                placeholder="Search products..."
                style={{width:'100%',padding:'11px 16px 11px 40px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',background:'#fff',boxSizing:'border-box'}}
              />
              <svg style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#aaa'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>

            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {categories.map(cat => (
                <a key={cat}
                  href={cat === 'All' ? '/products' + (q ? `?q=${q}` : '') : `/products?category=${encodeURIComponent(cat)}${q ? `&q=${q}` : ''}`}
                  style={{
                    padding:'8px 18px',borderRadius:999,fontSize:13,fontWeight:500,
                    textDecoration:'none',border:'1.5px solid',
                    borderColor: (category === cat || (!category && cat === 'All')) ? '#000' : '#e5e5e3',
                    background: (category === cat || (!category && cat === 'All')) ? '#000' : '#fff',
                    color: (category === cat || (!category && cat === 'All')) ? '#fff' : '#555',
                  }}>
                  {cat}
                </a>
              ))}
            </div>

            {(q || category) && (
              <a href="/products" style={{fontSize:13,color:'#aaa',textDecoration:'none',whiteSpace:'nowrap'}}>
                Clear ×
              </a>
            )}
          </div>
        </form>

        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px 0',color:'#aaa'}}>
            <p style={{fontSize:18,marginBottom:8}}>No products found</p>
            <a href="/products" style={{fontSize:14,color:'#000',textDecoration:'underline'}}>Clear filters</a>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:'48px 24px'}}>
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}