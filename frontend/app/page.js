import { redirect } from 'next/navigation'
import { homepageContent } from './lib/homepageContent'
import { getApiUrl } from './lib/api'
import ProductCarousel from './components/ProductCarousel'
import HeroCarousel from './components/HeroCarousel'

async function getProducts() {
  try {
    const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data.filter(p => !p.is_hidden && !(p.name || '').startsWith('[ARCHIVED]')) : []
  } catch {
    return []
  }
}

const W = 1160 // max content width

export default async function Home({ searchParams }) {
  const params = searchParams || {}
  const recoveryType = String(params.type || '')
  const hasRecoveryPayload =
    recoveryType === 'recovery' ||
    Boolean(params.token) ||
    Boolean(params.token_hash) ||
    Boolean(params.code)

  if (hasRecoveryPayload) {
    const qp = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value == null) return
      if (Array.isArray(value)) value.forEach((v) => qp.append(key, String(v)))
      else qp.set(key, String(value))
    })
    const query = qp.toString()
    redirect(query ? `/auth/reset?${query}` : '/auth/reset')
  }

  const { hero, promoTiles } = homepageContent
  const allProducts = await getProducts()
  const newArrivals = allProducts
    .filter(p => Array.isArray(p.tags) && p.tags.includes('new'))
    .slice(0, 4)

  // Build carousel slides from products that have a good cover photo
  // Prefer 'new' tagged products, then fill with others (max 6 slides)
  const slideProducts = [
    ...allProducts.filter(p => Array.isArray(p.tags) && p.tags.includes('new')),
    ...allProducts.filter(p => !Array.isArray(p.tags) || !p.tags.includes('new')),
  ]
    .filter(p => p.image_url || (Array.isArray(p.image_urls) && p.image_urls[0]))
    .slice(0, 6)

  const carouselSlides = slideProducts.map(p => ({
    image: (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url,
    title: p.name,
    label: p.category || '',
    href: `/products/${p.slug || p.id}`,
  }))

  return (
    <main style={{ paddingBottom: 80 }}>

      {/* ── 1. HERO CAROUSEL ───────────────────────────── */}
      {carouselSlides.length > 0
        ? <HeroCarousel slides={carouselSlides} />
        : (
          /* Fallback static banner if no products yet */
          <section style={{
            position: 'relative', minHeight: '80vh', overflow: 'hidden',
            borderRadius: '0 0 28px 28px', background: '#1a1a18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {hero.image && (
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,.2), rgba(0,0,0,.28)), url(${hero.image})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} aria-hidden="true" />
            )}
            <div style={{ position: 'relative', textAlign: 'center', color: '#fff', padding: '0 24px', maxWidth: 640 }}>
              <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 600, lineHeight: 0.95, margin: '0 0 20px' }}>{hero.title}</h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', margin: '0 0 36px' }}>{hero.subtitle}</p>
              <a href="/products" className="hero-cta">{hero.cta}</a>
            </div>
          </section>
        )
      }

      {/* ── 2. NEW ARRIVALS ────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section style={{ maxWidth: W, margin: '0 auto', padding: '72px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>New Arrivals</h2>
            <a href="/products?special=new" style={{ fontSize: 12, color: '#888', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              View all →
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '32px 20px' }}>
            {newArrivals.map(p => {
              const img = (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url || ''
              const price = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p.price || 0))
              return (
                <a key={p.id} href={`/products/${p.slug || p.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ aspectRatio: '4/5', background: '#f5f5f3', borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                    {img && <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                  <p style={{ fontSize: 11, color: '#9a9a92', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>{p.category || 'Essentials'}</p>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 5px', lineHeight: 1.3 }}>{p.name}</h3>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#111' }}>{price}</p>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* ── 3. ALL PRODUCTS CAROUSEL ───────────────────── */}
      {allProducts.length > 0 && (
        <section style={{ maxWidth: W, margin: '0 auto', padding: '72px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>All Products</h2>
            <a href="/products" style={{ fontSize: 12, color: '#888', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              View all →
            </a>
          </div>
          <ProductCarousel products={allProducts} />
        </section>
      )}

      {/* ── 4. CATEGORIES ─────────────────────────────── */}
      <section style={{ maxWidth: W, margin: '0 auto', padding: '72px 24px 0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 32px', letterSpacing: '-0.01em' }}>Shop by category</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {promoTiles.map(tile => (
            <a key={tile.title} href={tile.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 18, overflow: 'hidden', border: '1px solid #ececea', background: '#f5f5f3' }}>
              <div style={{
                aspectRatio: '4/5', backgroundImage: `url(${tile.image})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transition: 'transform 500ms ease',
              }} aria-label={tile.title} />
              <div style={{ background: '#fff', padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0, color: '#111' }}>{tile.title}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

    </main>
  )
}
