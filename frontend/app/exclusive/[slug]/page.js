import ProductCard from '../../components/ProductCard'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getApiUrl } from '../../lib/api'
import { getMessages, pathForLocale } from '../../lib/i18n'
import { getUahRate } from '../../lib/money'

function titleFromSlug(slug = '') {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function getExclusiveProducts(slug) {
  try {
    const res = await fetch(getApiUrl(`/products/exclusive/${slug}`), { next: { revalidate: 300 } })
    if (res.status === 404) return null
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function buildColorSiblingsMap(products) {
  const groups = {}
  for (const product of products) {
    if (!product.color_group_id) continue
    if (!groups[product.color_group_id]) groups[product.color_group_id] = []
    const imageUrls = Array.isArray(product.image_urls) ? product.image_urls : []
    groups[product.color_group_id].push({
      id: product.id,
      slug: product.slug || String(product.id),
      color_name: product.color_name,
      color_hex: product.color_hex,
      image_url: product.image_url,
      image_urls: imageUrls,
      hover_image_url: imageUrls[1] || product.image_url,
      in_stock: (product.available_stock ?? product.stock ?? 0) > 0,
    })
  }
  const map = {}
  for (const members of Object.values(groups)) {
    for (const member of members) map[member.id] = members.filter((item) => item.id !== member.id)
  }
  return map
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  return {
    title: `${titleFromSlug(slug)} — edm.clothes`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function ExclusivePage({ params, locale = 'en' }) {
  const { slug } = await params
  const products = await getExclusiveProducts(slug)
  if (products === null) notFound()

  const d = getMessages(locale)
  const pageTitle = titleFromSlug(slug) || 'Exclusive Samples'
  const colorSiblingsMap = buildColorSiblingsMap(products)
  const uahRate = locale === 'uk' ? await getUahRate() : undefined

  return (
    <main className="products-main" style={{ margin: 0, padding: 0 }}>
      <section style={{
        position: 'relative',
        minHeight: 'clamp(420px, 72vh, 760px)',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
        background: '#111',
      }}>
        <video
          className="exclusive-hero-video"
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/exclusive/exclusive-samples-hero.jpg"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src="/exclusive/exclusive-samples-hero.mp4" type="video/mp4" />
        </video>
        <picture className="exclusive-hero-motion">
          <source media="(max-width: 767px)" srcSet="/exclusive/exclusive-samples-hero-mobile.gif" type="image/gif" />
          <img
            src="/exclusive/exclusive-samples-hero.jpg"
            alt=""
            loading="eager"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </picture>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.6)' }} />
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '40px 28px 52px',
          color: '#fff',
        }}>
          <Link href={pathForLocale('/products', locale)} style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', textDecoration: 'none', display: 'inline-block', marginBottom: 18 }}>
            {d.product.back}
          </Link>
          <h1 style={{ fontSize: 'clamp(36px, 7vw, 86px)', fontWeight: 700, margin: '0 0 14px', lineHeight: 0.95 }}>
            {pageTitle}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0, maxWidth: 560 }}>
            Private sample selection.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 28px 72px' }}>
        <div className="products-header-row" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            {pageTitle}
          </h2>
          <span style={{ fontSize: 13, color: '#aaa' }}>{products.length} {d.products.items}</span>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 0', color: '#aaa' }}>
            <p style={{ fontSize: 16, margin: 0 }}>{d.products.noProducts}</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                colorSiblings={colorSiblingsMap[product.id] || []}
                imagePriority={index < 2}
                locale={locale}
                uahRate={uahRate}
              />
            ))}
          </div>
        )}
      </section>
      <style>{`
        .exclusive-hero-motion {
          display: none;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        @media (max-width: 767px) {
          .exclusive-hero-video {
            display: none;
          }

          .exclusive-hero-motion {
            display: block;
          }
        }
      `}</style>
    </main>
  )
}
