import AddToCartButton from '../../components/AddToCartButton'
import ProductGallery from '../../components/ProductGallery'
import { getApiUrl } from '../../lib/api'

async function getProduct(id) {
  const res = await fetch(getApiUrl('/products/' + id), { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: 'Product not found' }
  const image = (Array.isArray(product.image_urls) && product.image_urls[0]) || product.image_url

  return {
    title: product.name + ' — STORE',
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: image ? [{ url: image, width: 800, height: 800, alt: product.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: image ? [image] : [],
    },
  }
}

export default async function ProductPage({ params }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return <div style={{padding:48,textAlign:'center',color:'#aaa'}}>Product not found</div>
  const availableStock = product.available_stock ?? product.stock ?? 0
  const isInStock = availableStock > 0
  const isLowStock = availableStock > 0 && availableStock <= 5
  const materialCare = (product.material_care || '').trim() || 'No material and care information yet.'
  const moreAboutProduct = (product.product_details || '').trim() || 'More product details will be added soon.'
  const fitInfo = (product.fit_info || '').trim() || 'Fit guidance will be added soon.'
  const priceLabel = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(product.price || 0))

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
      priceCurrency: 'EUR',
      availability: availableStock > 0
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
      <main className="product-detail-page" style={{maxWidth:1220,margin:'0 auto',padding:'40px 24px 64px'}}>
        <a href="/products" style={{fontSize:14,color:'#aaa',textDecoration:'none',display:'inline-block',marginBottom:22}}>← Back</a>

        <div
          className="product-detail-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 32,
            alignItems: 'start',
          }}>
          <div className="product-detail-media">
            <ProductGallery product={product} />
          </div>

          <div className="product-detail-info" style={{display:'flex',flexDirection:'column',gap:14}}>
            <h1 className="product-detail-title" style={{fontWeight:600,margin:0}}>{product.name}</h1>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <p className="product-detail-price" style={{fontWeight:600,margin:0}}>{priceLabel}</p>
              <p style={{fontSize:14,color:'#8a8a84',margin:0}}>incl. tax</p>
            </div>
            <p style={{fontSize:14,color:'#666660',margin:0}}>
              Color: <span style={{fontWeight:600,color:'#1a1a18'}}>{(product.category || 'Standard').toLowerCase()}</span>
            </p>
            <p style={{fontSize:12,color: !isInStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#16a34a',margin:'-6px 0 0'}}>
              {!isInStock ? 'Out of stock' : isLowStock ? 'LOW STOCK' : 'In stock'}
            </p>

            <div style={{padding:'14px 16px',background:'#efefed',color:'#4a4a45',fontSize:14,borderRadius:8}}>
              We recommend choosing your regular size.
            </div>

            <AddToCartButton product={product} showSizeSelector />

            <p style={{color:'#888',fontSize:14,lineHeight:1.7,margin:0}}>{product.description}</p>

            <div style={{borderTop:'1px solid #e5e5e0',marginTop:8}}>
              <details style={{borderBottom:'1px solid #e5e5e0'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:16,fontWeight:600,color:'#111'}}>
                  Material & care
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,whiteSpace:'pre-wrap'}}>
                  {materialCare}
                </div>
              </details>
              <details style={{borderBottom:'1px solid #e5e5e0'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:16,fontWeight:600,color:'#111'}}>
                  More about this product
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,whiteSpace:'pre-wrap'}}>
                  {moreAboutProduct}
                </div>
              </details>
              <details style={{borderBottom:'1px solid #e5e5e0'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:16,fontWeight:600,color:'#111'}}>
                  Fit
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,whiteSpace:'pre-wrap'}}>
                  {fitInfo}
                </div>
              </details>
            </div>

            <div style={{border:'1px solid #e7e7e2',borderRadius:8,overflow:'hidden'}}>
              <div style={{padding:'14px 16px',fontSize:14,borderBottom:'1px solid #e7e7e2'}}>
                Sold and shipped by STORE
              </div>
              <div style={{padding:'14px 16px',fontSize:14,borderBottom:'1px solid #e7e7e2'}}>
                Free standard delivery for this item
              </div>
              <div style={{padding:'14px 16px',fontSize:14}}>
                30-day free returns
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}