import AddToCartButton from '../../components/AddToCartButton'
import WishlistButton from '../../components/WishlistButton'
import ProductGallery from '../../components/ProductGallery'
import ProductCard from '../../components/ProductCard'
import RecommendationsCarousel from '../../components/RecommendationsCarousel'
import ProductDetailsEventTracker from '../../components/ProductDetailsEventTracker'
import PageViewTracker from '../../components/PageViewTracker'
import Link from 'next/link'
import { getApiUrl } from '../../lib/api'
import { parseSizeOptionsFromTags } from '../../lib/sizeOptions'
import { safeJsonLd } from '../../lib/safeJsonLd'
import { notFound } from 'next/navigation'
import { getMessages, localizeProduct, pathForLocale } from '../../lib/i18n'
import { localizedAlternates, openGraphLocale } from '../../lib/seo'
import { getUahRate, currencyForLocale, priceForLocale, formatPrice } from '../../lib/money'

function cleanMetaText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()
}

function firstSentence(value = '') {
  const text = cleanMetaText(value)
  if (!text) return ''
  const match = text.match(/^(.+?[.!?])\s/)
  return cleanMetaText(match ? match[1] : text)
}

function materialLine(value = '') {
  const text = String(value || '')
  const match = text.match(/(?:Material|Матеріал):\s*([^\n.]+)/i)
  return match ? cleanMetaText(match[1]) : ''
}

function compactMetaDescription(parts, maxLength = 170) {
  const uniqueParts = []
  const seen = new Set()
  for (const part of parts.map(cleanMetaText).filter(Boolean)) {
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    uniqueParts.push(part)
  }

  let description = ''
  for (const part of uniqueParts) {
    const next = description ? `${description} ${part}` : part
    if (next.length <= maxLength) {
      description = next
    } else if (!description) {
      description = `${part.slice(0, maxLength - 3).trim()}...`
    }
  }
  return description || 'Shop edm.clothes essentials, made in Ukraine.'
}

function buildProductMetaDescription(product) {
  const material = materialLine(product.material_care)
  return compactMetaDescription([
    firstSentence(product.description),
    firstSentence(product.product_details),
    material ? `Material: ${material}.` : '',
    'Made in Ukraine.',
  ])
}

async function getProduct(slug) {
  try {
    const res = await fetch(getApiUrl('/products/' + slug), { next: { revalidate: 300 } })
    if (res.status === 404) return { notFound: true }
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function getAllProducts() {
  try {
    const res = await fetch(getApiUrl('/products'), { next: { revalidate: 300 } })
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

export async function generateMetadata({ params, locale = 'en' }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (product?.notFound) notFound()
  if (!product) return { title: 'Product not found' }
  const displayProduct = localizeProduct(product, locale)
  const image = (Array.isArray(product.image_urls) && product.image_urls[0]) || product.image_url
  const desc = buildProductMetaDescription(displayProduct)

  return {
    title: displayProduct.name,
    description: desc,
    alternates: localizedAlternates(`/products/${slug}`, locale),
    openGraph: {
      title: displayProduct.name,
      description: desc,
      locale: openGraphLocale(locale),
      images: image ? [{ url: image, width: 800, height: 800, alt: displayProduct.name }] : [],
      // og:type is emitted as "product" via <meta> in the page body so Pinterest
      // Rich Pins / Facebook can read product-extension tags. Next.js's openGraph
      // type field has no 'product' case (only website/article/book/…), so omit it
      // here to avoid a conflicting og:type tag.
    },
    twitter: {
      card: 'summary_large_image',
      title: displayProduct.name,
      description: desc,
      images: image ? [image] : [],
    },
  }
}

export default async function ProductPage({ params, locale = 'en' }) {
  const d = getMessages(locale)
  const { slug } = await params
  const [product, allProducts] = await Promise.all([getProduct(slug), getAllProducts()])
  if (product?.notFound) notFound()
  const sizeStock = product ? await getSizeStock(product.id) : {}
  if (!product) return <div style={{padding:48,textAlign:'center',color:'#aaa'}}>{d.product.unavailable}</div>
  const displayProduct = localizeProduct(product, locale)
  const recommendations = buildRecommendations(product, allProducts)
  const availableStock = product.available_stock ?? product.stock ?? 0
  const isInStock = availableStock > 0
  const isLowStock = availableStock > 0 && availableStock <= 5
  const materialCare = (displayProduct.material_care || '').trim() || d.product.materialCareFallback
  const moreAboutProduct = (displayProduct.product_details || '').trim() || d.product.detailsFallback
  const fitInfo = (displayProduct.fit_info || '').trim() || d.product.fitFallback
  const uahRate = locale === 'uk' ? await getUahRate() : undefined
  const currency = currencyForLocale(locale)
  const displayPrice = priceForLocale(product, locale, uahRate)
  const priceLabel = formatPrice(displayPrice, currency)
  const sizeOptions = parseSizeOptionsFromTags(product.tags)

  const productImages = Array.isArray(product.image_urls) && product.image_urls.length
    ? product.image_urls
    : product.image_url ? [product.image_url] : []
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: displayProduct.name,
    description: displayProduct.description,
    image: productImages,
    sku: String(product.id),
    category: product.category,
    brand: { '@type': 'Brand', name: 'edm.clothes' },
    offers: {
      '@type': 'Offer',
      price: displayPrice,
      priceCurrency: currency,
      availability: availableStock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `https://www.edmclothes.net${pathForLocale(`/products/${slug}`, locale)}`,
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          currency: 'EUR',
          minValue: 0,
          maxValue: 30,
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'DE',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'd' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 7, unitCode: 'd' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'DE',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: d.product.breadcrumbHome, item: `https://www.edmclothes.net${pathForLocale('/', locale)}` },
      { '@type': 'ListItem', position: 2, name: d.product.breadcrumbShop, item: `https://www.edmclothes.net${pathForLocale('/products', locale)}` },
      { '@type': 'ListItem', position: 3, name: displayProduct.name, item: `https://www.edmclothes.net${pathForLocale(`/products/${slug}`, locale)}` },
    ],
  }

  const ogAvailability = isInStock ? 'instock' : 'out of stock'
  const ogPrice = String(displayPrice || 0)

  return (
    <>
      {/* Pinterest Product Rich Pin / OG product extension tags. Pinterest accepts
          either Schema.org or Open Graph; we emit both. React 19 hoists <meta> to <head>. */}
      <meta property="og:type" content="product" />
      <meta property="product:price:amount" content={ogPrice} />
      <meta property="product:price:currency" content={currency} />
      <meta property="product:availability" content={ogAvailability} />
      <meta property="product:brand" content="edm.clothes" />
      <meta property="product:condition" content="new" />
      <meta property="og:price:amount" content={ogPrice} />
      <meta property="og:price:currency" content={currency} />
      <meta property="og:availability" content={ogAvailability} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <ProductDetailsEventTracker
        product={{
          id: product.id,
          slug: product.slug || slug,
          colorGroupId: product.color_group_id,
          name: displayProduct.name,
          price: product.price,
          category: product.category,
        }}
      />
      <PageViewTracker pageType="product" entityId={product.id} />
      <main className="product-detail-page" style={{maxWidth:1280,margin:'0 auto',padding:'38px 24px 64px'}}>
        <Link href={pathForLocale('/products', locale)} style={{fontSize:11,color:'#555',textDecoration:'none',display:'inline-block',marginBottom:22,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase'}}>{d.product.back}</Link>

        <div
          className="product-detail-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 32,
            alignItems: 'start',
          }}>
          <div className="product-detail-media">
            <ProductGallery product={displayProduct} locale={locale} />
          </div>

          <div className="product-detail-info" style={{display:'flex',flexDirection:'column',gap:14}}>
            <h1 className="product-detail-title" style={{fontWeight:800,margin:0,letterSpacing:0,textTransform:'uppercase'}}>{displayProduct.name}</h1>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <p className="product-detail-price" style={{fontWeight:700,margin:0}}>{priceLabel}</p>
              {d.product.inclTax && (
                <p style={{fontSize:12,color:'#666',margin:0,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>{d.product.inclTax}</p>
              )}
            </div>
            <p style={{fontSize:11,color: !isInStock ? '#f02a2a' : isLowStock ? '#7a6500' : '#0a0a0a',margin:0,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase'}}>
              {!isInStock ? d.product.outOfStock : isLowStock ? d.product.lowStock : d.product.inStock}
            </p>

            {/* Color swatches — shown only when color_name is set */}
            {product.color_name && (
              <div>
                <p style={{fontSize:12,color:'#666',margin:'0 0 8px',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>
                  {d.product.color}: <span style={{fontWeight:700,color:'#0a0a0a'}}>{product.color_name}</span>
                </p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  {/* Current product swatch */}
                  <div title={product.color_name} style={{
                    width:28,height:28,borderRadius:0,
                    background: product.color_hex || '#ccc',
                    border:'2.5px solid #111',
                    boxShadow:'0 0 0 2px #fff inset',
                    flexShrink:0,
                  }} />
                  {/* Variant swatches */}
                  {Array.isArray(product.color_variants) && product.color_variants.map(v => (
                    <a key={v.id} href={pathForLocale('/products/' + v.slug, locale)} title={v.color_name}
                      style={{
                        width:28,height:28,borderRadius:0,
                        background: v.color_hex || '#ccc',
                        border:'2px solid transparent',
                        boxShadow:'0 0 0 1.5px #ccc',
                        flexShrink:0,
                        display:'block',
                        opacity: v.in_stock ? 1 : 0.55,
                        textDecoration:'none',
                      }} />
                  ))}
                </div>
              </div>
            )}

            {sizeOptions.length > 0 && (
              <div style={{padding:'13px 14px',background:'#fff',color:'#0a0a0a',fontSize:12,borderRadius:0,border:'1px solid #0a0a0a',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>
                {d.product.regularSize}
              </div>
            )}

            <AddToCartButton product={displayProduct} showSizeSelector sizeStock={sizeStock} locale={locale} />
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
              <WishlistButton productId={product.id} product={displayProduct} style={{
                width:44,height:44,borderRadius:0,
                background:'#fff',border:'1px solid #0a0a0a',
              }}/>
              <span style={{fontSize:12,color:'#555',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>{d.product.saveWishlist}</span>
            </div>

            <p style={{color:'#555',fontSize:14,lineHeight:1.65,margin:0}}>{displayProduct.description}</p>

            <div style={{borderTop:'1px solid #0a0a0a',marginTop:8}}>
              <details style={{borderBottom:'1px solid #0a0a0a'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,fontWeight:700,color:'#111',letterSpacing:'0.08em',textTransform:'uppercase'}}>
                  {d.product.materialCare}
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,whiteSpace:'pre-wrap'}}>
                  {materialCare}
                </div>
              </details>
              <details style={{borderBottom:'1px solid #0a0a0a'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,fontWeight:700,color:'#111',letterSpacing:'0.08em',textTransform:'uppercase'}}>
                  {d.product.details}
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,whiteSpace:'pre-wrap'}}>
                  {moreAboutProduct}
                </div>
              </details>
              <details style={{borderBottom:'1px solid #0a0a0a'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,fontWeight:700,color:'#111',letterSpacing:'0.08em',textTransform:'uppercase'}}>
                  {d.product.fit}
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,whiteSpace:'pre-wrap'}}>
                  {fitInfo}
                </div>
              </details>
            </div>

              <details data-product-track-section="shipping_returns" style={{borderBottom:'1px solid #0a0a0a'}}>
                <summary style={{listStyle:'none',cursor:'pointer',padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,fontWeight:700,color:'#111',letterSpacing:'0.08em',textTransform:'uppercase'}}>
                  {d.product.shippingReturns}
                  <span style={{fontSize:22,lineHeight:1,color:'#111'}}>⌄</span>
                </summary>
                <div style={{padding:'0 0 18px',color:'#5f5f58',fontSize:14,lineHeight:1.65,display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{margin:0}}>{d.product.shippingCost}</p>
                  <p style={{margin:0}}>{d.product.freeShipping}</p>
                  <p style={{margin:0}}>{d.product.returnWindow}</p>
                </div>
              </details>
          </div>
        </div>
      </main>

      {/* ── RECOMMENDATIONS ─────────────────────────────── */}
      {recommendations.length > 0 && (
        <section className="product-recommendations" style={{maxWidth:1220,margin:'0 auto',padding:'48px 24px 72px'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:24,paddingTop:18,borderTop:'1px solid #0a0a0a'}}>
            <h2 style={{fontSize:18,fontWeight:800,margin:0,letterSpacing:'0.08em',textTransform:'uppercase'}}>{d.product.mayLike}</h2>
            <Link href={pathForLocale('/products', locale)} style={{fontSize:11,color:'#111',textDecoration:'none',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:700}}>{d.product.viewAll} →</Link>
          </div>
          {/* Mobile + desktop: grid */}
          <div className="recommendations-grid">
            {recommendations.map(p => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>

          {/* Tablet: 2-item carousel */}
          <div className="recommendations-carousel">
            <RecommendationsCarousel products={recommendations} locale={locale} />
          </div>
        </section>
      )}
    </>
  )
}
