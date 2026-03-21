import AddToCartButton from '../../components/AddToCartButton'

async function getProduct(id) {
  const res = await fetch('https://clothing-store-production-983f.up.railway.app/products/' + id, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: 'Product not found' }

  return {
    title: product.name + ' — STORE',
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image_url ? [{ url: product.image_url, width: 800, height: 800, alt: product.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: product.image_url ? [product.image_url] : [],
    },
  }
}

export default async function ProductPage({ params }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return <div style={{padding:48,textAlign:'center',color:'#aaa'}}>Product not found</div>

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image_url,
    sku: String(product.id),
    category: product.category,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: 'https://yourstore.com/products/' + product.id,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main style={{maxWidth:900,margin:'0 auto',padding:'48px 24px'}}>
        <a href="/products" style={{fontSize:14,color:'#aaa',textDecoration:'none',display:'inline-block',marginBottom:40}}>← Back</a>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64}}>
          <div style={{aspectRatio:'1',background:'#f5f5f3',borderRadius:20,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc'}}>
            {product.image_url
              ? <img src={product.image_url} alt={product.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : 'No image'
            }
          </div>

          <div style={{display:'flex',flexDirection:'column',justifyContent:'center',gap:16}}>
            <p style={{fontSize:11,color:'#aaa',letterSpacing:'0.15em',textTransform:'uppercase',margin:0}}>{product.category}</p>
            <h1 style={{fontSize:32,fontWeight:600,margin:0,lineHeight:1.2}}>{product.name}</h1>
            <p style={{color:'#888',fontSize:14,lineHeight:1.7,margin:0}}>{product.description}</p>
            <p style={{fontSize:28,fontWeight:600,margin:0}}>${product.price}</p>
            <p style={{fontSize:12,color: product.stock > 0 ? '#16a34a' : '#ef4444',margin:0}}>
              {product.stock > 0 ? 'In stock — ' + product.stock + ' left' : 'Out of stock'}
            </p>
            <AddToCartButton product={product} />
          </div>
        </div>
      </main>
    </>
  )
}