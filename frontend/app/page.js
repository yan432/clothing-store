import Image from 'next/image'
import { preload } from 'react-dom'
import { redirect } from 'next/navigation'
import { homepageContent } from './lib/homepageContent'
import { getApiUrl } from './lib/api'
import ProductCard from './components/ProductCard'
import DropCountdown from './components/DropCountdown'
import { getMessages, localizeProduct, pathForLocale, translateCategory } from './lib/i18n'
import { localizedAlternates } from './lib/seo'
import { buildCollectionImageAlt, buildHomepageImageAlt } from './lib/seoText'
import { brandImage, getPublicBrands, imageForProduct, productsForBrand, withPreviewBrands } from './lib/marketplacePreview'
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
    const res = await fetch(getApiUrl('/products?scope=marketplace&limit=500'), { next: { revalidate: 300 } })
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

  const [allProducts, slides, dropTimer, photoTiles, landingContent, instagramPosts, publicBrands] = await Promise.all([getProducts(), getSlides(), getDropTimer(), getPhotoTiles(), getLandingContent(locale), getInstagramPosts(), getPublicBrands()])
  const previewBrands = withPreviewBrands(publicBrands, allProducts)
  const featuredBrands = previewBrands.slice(0, 4)
  const platformHero = locale === 'uk'
    ? {
        season: 'Multi-brand platform',
        title: 'Незалежний streetwear в одному місці',
        subtitle: 'Тестова версія нової структури: бренди, жіночі та чоловічі добірки, категорії і дропи в одній вітрині.',
        cta: 'Дивитись новинки',
      }
    : {
        season: 'Multi-brand platform',
        title: 'Independent streetwear in one place',
        subtitle: 'A preview of the new structure: brands, women and men edits, categories and drops inside one curated storefront.',
        cta: 'Shop new arrivals',
      }
  const hero = {
    ...homepageContent.hero,
    ...platformHero,
    image: landingContent?.hero?.image || homepageContent.hero.image,
    mobileImage: landingContent?.hero?.mobileImage || landingContent?.hero?.image || homepageContent.hero.mobileImage,
    overlay: landingContent?.hero?.overlay ?? homepageContent.hero.overlay,
  }
  const heroMobileImage = hero.mobileImage || '/homepage-hero-mobile.jpg'
  const heroMobileSizes = '100vw'
  const heroMobileSrcSet = nextImageSrcSet(heroMobileImage, [640, 750, 828], 75)
  const heroDesktopSrcSet = nextImageSrcSet(hero.image, [390, 480, 640, 750, 828, 1080, 1200, 1920], 65)
  const promoTiles = landingContent?.promoTiles || homepageContent.promoTiles
  const localizedPromoTiles = promoTiles.map(tile => ({
    ...tile,
    title: translateCategory(tile.title, locale),
    href: pathForLocale(tile.href, locale),
  }))
  const overlayPct = landingContent?.hero?.overlay ?? 72
  const ov = overlayPct / 100
  if (hero.image && heroMobileSrcSet) {
    preload(heroMobileImage, {
      as: 'image',
      imageSrcSet: heroMobileSrcSet,
      imageSizes: heroMobileSizes,
      media: '(max-width: 767px)',
      fetchPriority: 'high',
    })
  }
  if (hero.image && heroDesktopSrcSet) {
    preload(hero.image, {
      as: 'image',
      imageSrcSet: heroDesktopSrcSet,
      imageSizes: '100vw',
      media: '(min-width: 768px)',
      fetchPriority: 'high',
    })
  }
  const newArrivals = allProducts
    .filter(p => Array.isArray(p.tags) && p.tags.includes('new'))
    .slice(0, 4)
  const platformTiles = [
    { title: d.nav.women, href: pathForLocale('/women', locale), image: imageForProduct(allProducts[0]) || hero.image },
    { title: d.nav.men, href: pathForLocale('/men', locale), image: imageForProduct(allProducts[1]) || imageForProduct(allProducts[0]) || hero.image },
    { title: d.nav.brands, href: pathForLocale('/brands', locale), image: brandImage(featuredBrands[0], allProducts) || hero.image },
    { title: d.nav.sale, href: pathForLocale('/collections/sale', locale), image: imageForProduct(allProducts.find(p => Array.isArray(p.tags) && p.tags.includes('sale'))) || imageForProduct(allProducts[2]) || hero.image },
  ].filter(tile => tile.image)
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
        background: '#0a0a0a',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
      }}>
        {hero.image && (
          <picture style={{ position: 'absolute', inset: 0, display: 'block' }}>
            {heroMobileSrcSet && (
              <source
                media="(max-width: 767px)"
                sizes={heroMobileSizes}
                srcSet={heroMobileSrcSet}
              />
            )}
            <Image
              src={hero.image}
              alt={buildHomepageImageAlt(hero.title, locale, { fallback: 'edm.clothes Ukrainian streetwear collection' })}
              fill
              fetchPriority="high"
              loading="eager"
              quality={65}
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
          background: `linear-gradient(to top, rgba(0,0,0,${Math.min(0.88, ov + 0.16).toFixed(2)}), rgba(0,0,0,${(ov*0.34).toFixed(2)}), rgba(0,0,0,${(ov*0.48).toFixed(2)}))`,
        }} aria-hidden="true" />
        <div style={{ position: 'relative', textAlign: 'left', color: '#fff', padding: '0 24px 72px', maxWidth: 760, width: '100%', marginLeft: 'max(0px, calc((100vw - 1160px) / 2))' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', margin: '0 0 18px', fontWeight: 800 }}>
            {hero.season}
          </p>
          <h1 style={{ fontSize: 'clamp(44px, 8vw, 92px)', fontWeight: 900, lineHeight: 0.92, letterSpacing: 0, margin: '0 0 18px', textTransform: 'uppercase' }}>
            {hero.title}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', margin: '0 0 32px', lineHeight: 1.55, maxWidth: 520 }}>
            {hero.subtitle}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a href={pathForLocale('/collections/new', locale)} className="hero-cta">{hero.cta}</a>
            <a href={pathForLocale('/brands', locale)} className="hero-cta" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.72)' }}>{d.nav.brands}</a>
          </div>
        </div>
      </section>

      {/* ── 2. DROP TIMER ─────────────────────────────── */}
      {dropTimer && <DropCountdown targetDate={dropTimer.date} label={dropTimer.label} />}

      {/* ── 3. PLATFORM ENTRY POINTS ──────────────────── */}
      {platformTiles.length > 0 && (
        <section style={{ maxWidth: 1320, margin: '0 auto', padding: '34px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 18, paddingTop: 18, borderTop: '1px solid #0a0a0a' }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {locale === 'uk' ? 'Вітрина платформи' : 'Shop the platform'}
            </h2>
            <a href={pathForLocale('/products', locale)} style={{ fontSize: 11, color: '#111', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800 }}>
              {d.nav.allProducts} →
            </a>
          </div>
          <div className="marketplace-entry-grid">
            {platformTiles.map(tile => (
              <a key={tile.href} href={tile.href} style={{ position: 'relative', minHeight: 260, display: 'flex', alignItems: 'flex-end', overflow: 'hidden', color: '#fff', textDecoration: 'none', background: '#111' }}>
                <Image
                  src={tile.image}
                  alt={tile.title}
                  fill
                  sizes="(max-width: 760px) 50vw, 25vw"
                  style={{ objectFit: 'cover', opacity: 0.78, transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.08))' }} />
                <div style={{ position: 'relative', zIndex: 1, padding: 18 }}>
                  <p style={{ margin: 0, fontSize: 22, lineHeight: 1, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{tile.title}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. FEATURED BRANDS ────────────────────────── */}
      {featuredBrands.length > 0 && (
        <section style={{ maxWidth: 1320, margin: '0 auto', padding: '44px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 18, paddingTop: 18, borderTop: '1px solid #0a0a0a' }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {d.nav.brands}
            </h2>
            <a href={pathForLocale('/brands', locale)} style={{ fontSize: 11, color: '#111', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800 }}>
              {d.home.viewAll} →
            </a>
          </div>
          <div className="marketplace-brand-grid">
            {featuredBrands.map(brand => {
              const count = productsForBrand(allProducts, brand).length
              const image = brandImage(brand, allProducts)
              return (
                <a key={brand.slug} href={pathForLocale(`/products?brand=${brand.id}`, locale)} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 14, alignItems: 'center', color: 'inherit', textDecoration: 'none', border: '1px solid #0a0a0a', background: '#fff', padding: 12 }}>
                  <div style={{ position: 'relative', width: 96, aspectRatio: '1/1', background: '#e7e5dc', overflow: 'hidden' }}>
                    {image && <Image src={image} alt="" fill sizes="96px" style={{ objectFit: 'cover' }} />}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{brand.name}</h3>
                    <p style={{ margin: 0, fontSize: 11, color: '#666', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{count} {d.products.items}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* ── 5. PHOTO TILES ─────────────────────────────── */}
      {photoTiles.length > 0 && <HomepagePhotoTiles tiles={photoTiles} />}

      {/* ── 6. CUSTOM PHOTO CAROUSEL ───────────────────── */}
      {slides.length > 0 && (
        <section style={{ marginTop: 0 }}>
          <HeroCarousel slides={slides.map(s => ({ image: s.image_url, title: localizeSlideTitle(s), href: pathForLocale(s.href || '/products', locale), link_label: localizeSlideCta(s.link_label), label: '' }))} fullWidth />
        </section>
      )}

      {/* ── 7. NEW ARRIVALS ────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section style={{ maxWidth: W, margin: '0 auto', padding: '26px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, paddingTop: 18, borderTop: '1px solid #0a0a0a' }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{d.home.newArrivals}</h2>
            <a href={pathForLocale('/collections/new', locale)} style={{ fontSize: 11, color: '#111', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800 }}>
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
      <section style={{ maxWidth: W, margin: '0 auto', padding: '44px 24px 0' }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 24px', letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: 18, borderTop: '1px solid #0a0a0a' }}>{d.home.shopByCategory}</h2>

        {/* Mobile + desktop: grid */}
        <div className="home-categories-grid">
          {localizedPromoTiles.map(tile => (
            <a key={`${tile.href}-${tile.title}`} href={tile.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 0, overflow: 'hidden', border: '1px solid #0a0a0a', background: '#fff' }}>
              <div className="category-tile-img" style={{ position: 'relative', aspectRatio: '4/5' }} aria-label={tile.title}>
                <Image
                  src={tile.image}
                  alt={buildCollectionImageAlt(tile.title, locale)}
                  fill
                  sizes="(max-width: 679px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
              <div style={{ background: '#fff', padding: '13px 14px', textAlign: 'left', borderTop: '1px solid #0a0a0a' }}>
                <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{tile.title}</p>
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
