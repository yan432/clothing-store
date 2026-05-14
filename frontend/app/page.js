export const metadata = {
  alternates: { canonical: '/' },
}

import Image from 'next/image'
import { redirect } from 'next/navigation'
import { homepageContent } from './lib/homepageContent'
import { getApiUrl } from './lib/api'
import HeroCarousel from './components/HeroCarousel'
import HomeArrivalsCarousel from './components/HomeArrivalsCarousel'
import HomeCategoriesCarousel from './components/HomeCategoriesCarousel'
import HomepagePhotoTiles from './components/HomepagePhotoTiles'
import ProductCard from './components/ProductCard'
import DropCountdown from './components/DropCountdown'

async function getProducts() {
  try {
    const res = await fetch(getApiUrl('/products'), { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data.filter(p => !p.is_hidden && !(p.name || '').startsWith('[ARCHIVED]')) : []
  } catch { return [] }
}

async function getSlides() {
  try {
    const res = await fetch(getApiUrl('/homepage-slides'), { next: { revalidate: 300 } })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function getPhotoTiles() {
  try {
    const res = await fetch(getApiUrl('/homepage-photo-tiles'), { next: { revalidate: 300 } })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function getLandingContent() {
  try {
    const res = await fetch(getApiUrl('/settings'), { next: { revalidate: 300 } })
    if (!res.ok) return null
    const raw = await res.json()
    const map = Array.isArray(raw)
      ? Object.fromEntries(raw.map(r => [r.key, r.value]))
      : (raw && typeof raw === 'object' ? raw : {})
    return {
      hero: {
        season:   map.landing_hero_season   || null,
        title:    map.landing_hero_title    || null,
        subtitle: map.landing_hero_subtitle || null,
        cta:      map.landing_hero_cta      || null,
        image:    map.landing_hero_image    || null,
        overlay:  map.landing_hero_overlay != null ? Number(map.landing_hero_overlay) : null,
      },
      promoTiles: map.landing_promo_tiles ? (() => { try { return JSON.parse(map.landing_promo_tiles) } catch { return null } })() : null,
    }
  } catch { return null }
}

async function getDropTimer() {
  try {
    const res = await fetch(getApiUrl('/settings'), { next: { revalidate: 300 } })
    if (!res.ok) return null
    const raw = await res.json()
    const map = Array.isArray(raw)
      ? Object.fromEntries(raw.map(r => [r.key, r.value]))
      : (raw && typeof raw === 'object' ? raw : {})
    if (map.drop_timer_enabled !== 'true') return null
    if (!map.drop_timer_date) return null
    if (new Date(map.drop_timer_date).getTime() <= Date.now()) return null
    return { date: map.drop_timer_date, label: map.drop_timer_label || 'New Drop' }
  } catch { return null }
}

const W = 1160

export default async function Home({ searchParams }) {
  const params = searchParams || {}
  const recoveryType = String(params.type || '')
  const hasRecoveryPayload =
    recoveryType === 'recovery' || Boolean(params.token) ||
    Boolean(params.token_hash) || Boolean(params.code)

  if (hasRecoveryPayload) {
    const qp = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value == null) return
      if (Array.isArray(value)) value.forEach(v => qp.append(key, String(v)))
      else qp.set(key, String(value))
    })
    const query = qp.toString()
    redirect(query ? `/auth/reset?${query}` : '/auth/reset')
  }

  const [allProducts, slides, dropTimer, photoTiles, landingContent] = await Promise.all([getProducts(), getSlides(), getDropTimer(), getPhotoTiles(), getLandingContent()])
  const hero = {
    ...homepageContent.hero,
    ...(landingContent?.hero ? Object.fromEntries(Object.entries(landingContent.hero).filter(([, v]) => v !== null)) : {}),
  }
  const promoTiles = landingContent?.promoTiles || homepageContent.promoTiles
  const overlayPct = landingContent?.hero?.overlay ?? 72
  const ov = overlayPct / 100
  const newArrivals = allProducts
    .filter(p => Array.isArray(p.tags) && p.tags.includes('new'))
    .slice(0, 4)

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'edm.clothes',
    url: 'https://www.edmclothes.net',
    logo: 'https://www.edmclothes.net/icon.png',
    sameAs: [],
  }

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'edm.clothes',
    url: 'https://www.edmclothes.net',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.edmclothes.net/products?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <main className="home-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

      {/* ── 1. HERO BANNER ─────────────────────────────── */}
      <section style={{
        position: 'relative', minHeight: '92vh', overflow: 'hidden',
        background: '#1a1a18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {hero.image && (
          <Image
            src={hero.image}
            alt=""
            fill
            priority
            sizes="100vw"
            aria-hidden="true"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, rgba(0,0,0,${ov.toFixed(2)}), rgba(0,0,0,${(ov*0.28).toFixed(2)}), rgba(0,0,0,${(ov*0.42).toFixed(2)}))`,
        }} aria-hidden="true" />
        <div style={{ position: 'relative', textAlign: 'center', color: '#fff', padding: '0 24px', maxWidth: 640, width: '100%' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', margin: '0 0 20px' }}>
            {hero.season}
          </p>
          <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 600, lineHeight: 0.95, letterSpacing: '-0.01em', margin: '0 0 20px' }}>
            {hero.title}
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', margin: '0 0 36px', lineHeight: 1.6 }}>
            {hero.subtitle}
          </p>
          <a href="/products" className="hero-cta">{hero.cta}</a>
        </div>
      </section>

      {/* ── 2. DROP TIMER ─────────────────────────────── */}
      {dropTimer && <DropCountdown targetDate={dropTimer.date} label={dropTimer.label} />}

      {/* ── 3. PHOTO TILES ─────────────────────────────── */}
      {photoTiles.length > 0 && <HomepagePhotoTiles tiles={photoTiles} />}

      {/* ── 4. CUSTOM PHOTO CAROUSEL ───────────────────── */}
      {slides.length > 0 && (
        <section style={{ marginTop: 0 }}>
          <HeroCarousel slides={slides.map(s => ({ image: s.image_url, title: s.title, href: s.href, link_label: s.link_label, label: '' }))} fullWidth />
        </section>
      )}

      {/* ── 5. NEW ARRIVALS ────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section style={{ maxWidth: W, margin: '0 auto', padding: '18px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>New Arrivals</h2>
            <a href="/products?special=new" style={{ fontSize: 12, color: '#888', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              View all →
            </a>
          </div>

          {/* Mobile + desktop: regular grid */}
          <div className="home-arrivals-grid">
            {newArrivals.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Tablet: 3-item carousel */}
          <div className="home-arrivals-carousel">
            <HomeArrivalsCarousel products={newArrivals} />
          </div>
        </section>
      )}

      {/* ── 6. CATEGORIES ─────────────────────────────── */}
      <section style={{ maxWidth: W, margin: '0 auto', padding: '40px 24px 0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 32px' }}>Shop by category</h2>

        {/* Mobile + desktop: grid */}
        <div className="home-categories-grid">
          {promoTiles.map(tile => (
            <a key={tile.title} href={tile.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 18, overflow: 'hidden', border: '1px solid #ececea', background: '#f5f5f3' }}>
              <div className="category-tile-img" style={{ position: 'relative', aspectRatio: '4/5' }} aria-label={tile.title}>
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(max-width: 679px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
              <div style={{ background: '#fff', padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{tile.title}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Tablet: carousel */}
        <div className="home-categories-carousel">
          <HomeCategoriesCarousel tiles={promoTiles} />
        </div>
      </section>

    </main>
  )
}
