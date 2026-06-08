import Image from 'next/image'
import { redirect } from 'next/navigation'
import { homepageContent } from './lib/homepageContent'
import { getApiUrl } from './lib/api'
import ProductCard from './components/ProductCard'
import DropCountdown from './components/DropCountdown'
import { getMessages, localizeProduct, pathForLocale, translateCategory } from './lib/i18n'
import { localizedAlternates } from './lib/seo'
import { buildCollectionImageAlt, buildHomepageImageAlt } from './lib/seoText'
// All below-fold sections are lazy-loaded via a 'use client' wrapper so
// each gets its own JS chunk instead of bloating the initial bundle.
import {
  HeroCarousel,
  HomeArrivalsCarousel,
  HomeCategoriesCarousel,
  HomepagePhotoTiles,
  HomeInstagramFeed,
  HomeAboutTeaser,
} from './components/lazyHomeSections'

export const metadata = {
  alternates: localizedAlternates('/'),
}

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

async function getInstagramPosts() {
  try {
    const res = await fetch(getApiUrl('/instagram-posts'), { next: { revalidate: 300 } })
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

function localizedSetting(map, key, locale) {
  if (locale === 'uk') {
    const ukValue = map[`${key}_uk`]
    if (ukValue != null && String(ukValue).trim()) return ukValue
    return null
  }
  return map[key] || null
}

async function getLandingContent(locale = 'en') {
  try {
    const res = await fetch(getApiUrl('/settings'), { next: { revalidate: 300 } })
    if (!res.ok) return null
    const raw = await res.json()
    const map = Array.isArray(raw)
      ? Object.fromEntries(raw.map(r => [r.key, r.value]))
      : (raw && typeof raw === 'object' ? raw : {})
    return {
      hero: {
        season:   localizedSetting(map, 'landing_hero_season', locale),
        title:    localizedSetting(map, 'landing_hero_title', locale),
        subtitle: localizedSetting(map, 'landing_hero_subtitle', locale),
        cta:      localizedSetting(map, 'landing_hero_cta', locale),
        image:    map.landing_hero_image    || null,
        mobileImage: map.landing_hero_image_mobile || null,
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

function nextImageSrcSet(src, widths = [], quality = 75) {
  if (!src || String(src).startsWith('data:')) return ''
  const encoded = encodeURIComponent(src)
  return widths.map(width => `/_next/image?url=${encoded}&w=${width}&q=${quality} ${width}w`).join(', ')
}

const UK_SLIDE_TITLE_BY_SLUG = {
  'deconstructed-washed-jeans': 'Deconstructed джинси',
  'edm-washed-hoodie': 'EDM washed худі',
  'cargo-bermuda-shorts': 'Bermuda карго-шорти',
}

function productSlugFromHref(href = '') {
  const path = String(href || '').split(/[?#]/)[0].replace(/^\/ua(?=\/)/, '')
  const match = path.match(/^\/products\/([^/]+)$/)
  return match ? match[1] : ''
}

export default async function Home({ searchParams, locale = 'en' }) {
  const d = getMessages(locale)
  const params = await (searchParams || {})
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
    const resetPath = pathForLocale('/auth/reset', locale)
    redirect(query ? `${resetPath}?${query}` : resetPath)
  }

  const [allProducts, slides, dropTimer, photoTiles, landingContent, instagramPosts] = await Promise.all([getProducts(), getSlides(), getDropTimer(), getPhotoTiles(), getLandingContent(locale), getInstagramPosts()])
  const hero = {
    ...homepageContent.hero,
    ...(locale === 'uk' ? d.home.hero : {}),
    ...(landingContent?.hero ? Object.fromEntries(Object.entries(landingContent.hero).filter(([, v]) => v !== null)) : {}),
  }
  const heroMobileImage = hero.mobileImage || '/homepage-hero-mobile.jpg'
  const heroMobileSrcSet = nextImageSrcSet(heroMobileImage, [390, 640, 750, 828], 75)
  const promoTiles = landingContent?.promoTiles || homepageContent.promoTiles
  const localizedPromoTiles = promoTiles.map(tile => {
    const title = translateCategory(tile.title, locale)
    return {
      ...tile,
      title,
      alt: buildCollectionImageAlt(tile.title, locale),
      href: pathForLocale(tile.href, locale),
    }
  })
  const overlayPct = landingContent?.hero?.overlay ?? 72
  const ov = overlayPct / 100
  const newArrivals = allProducts
    .filter(p => Array.isArray(p.tags) && p.tags.includes('new'))
    .slice(0, 4)
  const localizeSlideCta = (label) => {
    if (locale === 'uk' && (!label || String(label).trim().toLowerCase() === 'shop now')) return d.home.hero.cta
    return label
  }
  const productBySlug = new Map(allProducts.map((product) => [product.slug || String(product.id), product]))
  const localizeSlideTitle = (slide) => {
    const title = slide.title || ''
    if (locale !== 'uk') return title

    const rawHref = slide.href || ''
    if (String(rawHref).includes('special=new')) return 'Новий дроп'

    const slug = productSlugFromHref(rawHref)
    if (slug) {
      const product = productBySlug.get(slug)
      const localizedName = product ? localizeProduct(product, 'uk').name : ''
      if (localizedName && localizedName !== product?.name) return localizedName
      if (UK_SLIDE_TITLE_BY_SLUG[slug]) return UK_SLIDE_TITLE_BY_SLUG[slug]
    }

    const normalizedTitle = title.trim().toLowerCase()
    if (normalizedTitle.includes('new drop')) return 'Новий дроп'
    if (normalizedTitle.includes('collection')) return 'Нова колекція'
    return title
  }

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
          <picture style={{ position: 'absolute', inset: 0, display: 'block' }}>
            {heroMobileSrcSet && (
              <source
                media="(max-width: 767px)"
                sizes="100vw"
                srcSet={heroMobileSrcSet}
              />
            )}
            <Image
              src={hero.image}
              alt={buildHomepageImageAlt(hero.title, locale, { fallback: 'edm.clothes Ukrainian streetwear collection' })}
              fill
              fetchPriority="high"
              loading="eager"
              quality={75}
              sizes="100vw"
              // 1x1 dark JPEG so the section never flashes flat black before
              // the full Supabase image lands on slower mobile connections.
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </picture>
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
          <a href={pathForLocale('/products', locale)} className="hero-cta">{hero.cta}</a>
        </div>
      </section>

      {/* ── 2. DROP TIMER ─────────────────────────────── */}
      {dropTimer && <DropCountdown targetDate={dropTimer.date} label={dropTimer.label} />}

      {/* ── 3. PHOTO TILES ─────────────────────────────── */}
      {photoTiles.length > 0 && <HomepagePhotoTiles tiles={photoTiles} />}

      {/* ── 4. CUSTOM PHOTO CAROUSEL ───────────────────── */}
      {slides.length > 0 && (
        <section style={{ marginTop: 0 }}>
          <HeroCarousel slides={slides.map(s => {
            const title = localizeSlideTitle(s)
            return {
              image: s.image_url,
              title,
              alt: buildHomepageImageAlt(title, locale, { fallback: 'edm.clothes collection slide' }),
              href: pathForLocale(s.href || '/products', locale),
              link_label: localizeSlideCta(s.link_label),
              label: '',
            }
          })} fullWidth />
        </section>
      )}

      {/* ── 5. NEW ARRIVALS ────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section style={{ maxWidth: W, margin: '0 auto', padding: '18px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{d.home.newArrivals}</h2>
            <a href={pathForLocale('/collections/new', locale)} style={{ fontSize: 12, color: '#5f5f58', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              {d.home.viewAll} →
            </a>
          </div>

          {/* Mobile + desktop: regular grid */}
          <div className="home-arrivals-grid">
            {newArrivals.map(p => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>

          {/* Tablet: 3-item carousel */}
          <div className="home-arrivals-carousel">
            <HomeArrivalsCarousel products={newArrivals} locale={locale} />
          </div>
        </section>
      )}

      {/* ── 6. INSTAGRAM FEED ──────────────────────────── */}
      <HomeInstagramFeed posts={instagramPosts} locale={locale} />

      {/* ── 7. LEARN MORE ABOUT US ─────────────────────── */}
      <HomeAboutTeaser locale={locale} />

      {/* ── 8. CATEGORIES ─────────────────────────────── */}
      <section style={{ maxWidth: W, margin: '0 auto', padding: '40px 24px 0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 32px' }}>{d.home.shopByCategory}</h2>

        {/* Mobile + desktop: grid */}
        <div className="home-categories-grid">
          {localizedPromoTiles.map(tile => (
            <a key={`${tile.href}-${tile.title}`} href={tile.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 18, overflow: 'hidden', border: '1px solid #ececea', background: '#f5f5f3' }}>
              <div className="category-tile-img" style={{ position: 'relative', aspectRatio: '4/5' }} aria-label={tile.title}>
                <Image
                  src={tile.image}
                  alt={tile.alt}
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
          <HomeCategoriesCarousel tiles={localizedPromoTiles} />
        </div>
      </section>

    </main>
  )
}
