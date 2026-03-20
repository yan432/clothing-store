import ProductCard from '../components/ProductCard'

export const metadata = {
  title: 'All Products',
  description: 'Browse our full collection of minimal clothing essentials.',
  openGraph: {
    title: 'All Products — STORE',
    description: 'Browse our full collection of minimal clothing essentials.',
  },
}

async function getProducts() {
  const res = await fetch('http://localhost:8000/products', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default async function ProductsPage() {
  const products = await getProducts()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'All Products',
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        image: p.image_url,
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'USD',
          availability: p.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main style={{maxWidth:1200,margin:'0 auto',padding:'48px 24px'}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:40}}>
          <h1 style={{fontSize:28,fontWeight:600,margin:0}}>All Products</h1>
          <p style={{fontSize:14,color:'#aaa',margin:0}}>{products.length} items</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:'48px 24px'}}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </>
  )
}