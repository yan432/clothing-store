import Image from 'next/image'
import Link from 'next/link'
import { getMessages, pathForLocale } from '../lib/i18n'
import { localizedAlternates } from '../lib/seo'
import { brandImage, getPublicBrands, getVisibleProducts, productsForBrand, withPreviewBrands } from '../lib/marketplacePreview'

export const metadata = {
  title: 'Brands — edm.clothes',
  description: 'Discover independent streetwear brands on edm.clothes.',
  alternates: localizedAlternates('/brands'),
}

export default async function BrandsPage({ locale = 'en' }) {
  const d = getMessages(locale)
  const [products, rawBrands] = await Promise.all([getVisibleProducts(), getPublicBrands()])
  const brands = withPreviewBrands(rawBrands, products)

  return (
    <main style={{ background: '#fff', minHeight: '100vh', color: '#10100e' }}>
      <section style={{ maxWidth: 1320, margin: '0 auto', padding: '54px 24px 30px' }}>
        <Link
          href={pathForLocale('/', locale)}
          style={{ display: 'inline-block', marginBottom: 24, color: '#65655c', fontSize: 12, fontWeight: 900, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          {locale === 'uk' ? 'Назад на головну' : 'Back to home'}
        </Link>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#65655c' }}>
          {locale === 'uk' ? 'Платформа брендів' : 'Brand platform'}
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(42px, 8vw, 108px)', lineHeight: 0.92, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
          {locale === 'uk' ? 'Бренди' : 'Brands'}
        </h1>
        <p style={{ maxWidth: 620, margin: '22px 0 0', fontSize: 17, lineHeight: 1.65, color: '#4f4f47' }}>
          {locale === 'uk'
            ? 'Тестова сторінка для майбутньої multi-brand структури: окремі вітрини, історії брендів і товари в одному каталозі.'
            : 'A preview directory for the future multi-brand structure: individual storefronts, brand stories and products in one shared catalog.'}
        </p>
      </section>

      <section style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 24px 72px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {brands.map(brand => {
            const brandProducts = productsForBrand(products, brand)
            const image = brandImage(brand, products)
            return (
              <Link
                key={brand.slug}
                href={pathForLocale(`/products?brand=${brand.id}`, locale)}
                style={{ display: 'block', color: 'inherit', textDecoration: 'none', border: '1px solid #10100e', background: '#fff' }}
              >
                <div style={{ position: 'relative', aspectRatio: '4/3', background: '#e7e5dc', overflow: 'hidden' }}>
                  {image && (
                    <Image src={image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {brand.name}
                    </h2>
                    <span style={{ fontSize: 10, color: '#65655c', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {brandProducts.length} {d.products.items}
                    </span>
                  </div>
                  {brand.description && (
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#56564f' }}>
                      {brand.description}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
