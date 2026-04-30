import AddToCartButton from '../../components/AddToCartButton'
import WishlistButton from '../../components/WishlistButton'
import ProductGallery from '../../components/ProductGallery'
import ProductViewTracker from '../../components/ProductViewTracker'
import ProductCard from '../../components/ProductCard'
import RecommendationsCarousel from '../../components/RecommendationsCarousel'
import { getApiUrl } from '../../lib/api'
import { parseSizeOptionsFromTags } from '../../lib/sizeOptions'

async function getProduct(slug) {
  const res = await fetch(getApiUrl('/products/' + slug), { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function getAllProducts() {
  try {
    const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function getSizeStock(productId) {
  try {
    const res = await fetch(getApiUrl(`/products/${productId}/size-stock`), { cache: 'no-store' })
    if (!res.ok) return {}
    return res.json()
  } catch { return {} }
}

function buildRecommendations(current, all) {
  const pool = all.filter(p => p.id !== current.id && !p.is_hidden)
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

  // Up to 2 from same category
  const samecat = shuffle(pool.filter(p => p.category && p.category === current.category)).slice(0, 2)

  // Fill remainder from other categories
  const usedIds = new Set(samecat.map(p => p.id))
  const otherCats = [...new Set(pool.filter(p => !usedIds.has(p.id) && p.category !== current.category).map(p => p.category))].filter(Boolean)
  const randomCat = otherCats.length ? otherCats[Math.floor(Math.random() * otherCats.length)] : null
  const otherPool = shuffle(randomCat
    ? pool.filter(p => !usedIds.has(p.id) && p.category === randomCat)
    : pool.filter(p => !usedIds.has(p.id))
  )
  const others = otherPool.slice(0, 4 - samecat.length)

  // If still not enough, pad with any remaining
  const total = [...samecat, ...others]
  if (total.length < 4) {
    const usedAll = new Set(total.map(p => p.id))
    const extra = shuffle(pool.filter(p => !usedAll.has(p.id))).slice(0, 4 - total.length)
    total.push(...extra)
  }
  return total.slice(0, 4)
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Product not found' }
  const image = (Array.isArray(product.image_urls) && product.image_urls[0]) || product.image_url

  return {
    title: product.name + ' — edm.clothes',
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
  const { slug } = await params
  const [product, allProducts] = await Promise.all([getProduct(slug), getAllProducts()])
  const sizeStock = product ? await getSizeStock(product.id) : {}
  if (!product) return <div style={{padding:48,textAlign:'center',color:'#aaa'}}>Product not found</div>
  const recommendations = buildRecommendations(product, allProducts)
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
  const sizeOptions = parseSizeOptionsFromTags(product.tags)

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
      <ProductViewTracker productId={product.id} />
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
            <p style={{fontSize:12,color: !isInStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#16a34a',margin:0}}>
              {!isInStock ? 'Out of stock' : isLowStock ? 'LOW STOCK' : 'In stock'}
            </p>

            {/* Color swatches — shown only when color_name is set */}
            {product.color_name && (
              <div>
                <p style={{fontSize:13,color:'#666660',margin:'0 0 8px'}}>
                  Color: <span style={{fontWeight:600,color:'#1a1a18'}}>{product.color_name}</span>
                </p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  {/* Current product swatch */}
                  <div title={product.color_name} style={{
                    width:28,height:28,borderRadius:'50%',
                    background: product.color_hex || '#ccc',
                    border:'2.5px solid #111',
                    boxShadow:'0 0 0 2px #fff inset',
                    flexShrink:0,
                  }} />
                  {/* Variant swatches */}
                  {Array.isArray(product.color_variants) && product.color_variants.map(v => (
                    v.is_hidden ? (
                      /* Hidden = coming soon, show as dim swatch, no link */
                      <div key={v.id} title={v.color_name + ' — coming soon'}
                        style={{
                          width:28,height:28,borderRadius:'50%',
                          background: v.color_hex || '#ccc',
                          border:'2px solid transparent',
                          boxShadow:'0 0 0 1.5px #ccc',
                          flexShrink:0,
                          opacity:0.35,
                          cursor:'default',
                          position:'relative',
                        }} />
                    ) : (
                      <a key={v.id} href={'/products/' + v.slug} title={v.color_name}
                        style={{
                          width:28,height:28,borderRadius:'50%',
                          background: v.color_hex || '#ccc',
                          border:'2px solid transparent',
                          boxShadow:'0 0 0 1.5px #ccc',
                          flexShrink:0,
                          display:'block',
                          opacity: v.in_stock ? 1 : 0.55,
                          textDecoration:'none',
                        }} />
                    )
                  ))}
                </div>
              </div>
            )}

            {sizeOptions.length > 0 && (
              <div style={{padding:'14px 16px',background:'#efefed',color:'#4a4a45',fontSize:14,borderRadius:8}}>
                We recommend choosing your regular size.
              </div>
            )}

            <AddToCartButton product={product} showSizeSelector sizeStock={sizeStock} />
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
              <WishlistButton productId={product.id} style={{
                width:44,height:44,borderRadius:12,
                background:'#f5f5f3',border:'1px solid #e5e5e3',
              }}/>
              <span style={{fontSize:13,color:'#888'}}>Save to wishlist</span>
            </div>

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

              <details style={{borderBottom:'1px solid #e5e5e0'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:16,fontWeight:600,color:'#111'}}>
                  Shipping &amp; returns
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{margin:0}}>Shipping cost is calculated at cart.</p>
                  <p style={{margin:0}}>Free shipping on orders from €120.</p>
                  <p style={{margin:0}}>14-day returns from date of receipt.</p>
                </div>
              </details>
          </div>
        </div>
      </main>

      {/* ── RECOMMENDATIONS ─────────────────────────────── */}
      {recommendations.length > 0 && (
        <section style={{maxWidth:1220,margin:'0 auto',padding:'48px 24px 72px'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:28}}>
            <h2 style={{fontSize:18,fontWeight:700,margin:0,letterSpacing:'-0.01em'}}>You may also like</h2>
            <a href="/products" style={{fontSize:12,color:'#888',textDecoration:'none',letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:600}}>View all →</a>
          </div>
          {/* Mobile + desktop: grid */}
          <div className="recommendations-grid">
            {recommendations.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Tablet: 2-item carousel */}
          <div className="recommendations-carousel">
            <RecommendationsCarousel products={recommendations} />
          </div>
        </section>
      )}
    </>
  )
}