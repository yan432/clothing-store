import Link from 'next/link'
import ProductCard from './ProductCard'
import { getMessages, pathForLocale, translateCategory } from '../lib/i18n'
import { getUahRate } from '../lib/money'
import {
  AUDIENCE_COPY,
  buildColorSiblingsMap,
  getPublicBrands,
  getVisibleProducts,
  orderPreviewProducts,
  productsForAudience,
} from '../lib/marketplacePreview'

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Accessories', 'Knitwear', 'Denim', 'Jackets']

export default async function AudienceShopPage({ audience, locale = 'en', searchParams }) {
  const d = getMessages(locale)
  const copy = AUDIENCE_COPY[audience]?.[locale === 'uk' ? 'uk' : 'en'] || AUDIENCE_COPY[audience].en
  const params = await (searchParams || {})
  const normalizeList = value => Array.isArray(value) ? value.filter(Boolean).map(String) : typeof value === 'string' && value ? [value] : []
  const selectedCategory = typeof params?.category === 'string' ? params.category : ''
  const selectedBrands = normalizeList(params?.brand)
  const selectedSpecial = typeof params?.special === 'string' ? params.special : ''
  const [products, brands] = await Promise.all([getVisibleProducts(), getPublicBrands()])
  const audienceProducts = productsForAudience(products, audience)
  const categories = Array.from(new Set(audienceProducts.map(product => product.category).filter(Boolean))).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
  const visibleProducts = orderPreviewProducts(audienceProducts.filter(product => {
    const tags = Array.isArray(product.tags) ? product.tags : []
    const matchCategory = !selectedCategory || product.category === selectedCategory
    const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(String(product.brand_id || ''))
    const matchSpecial = !selectedSpecial || (
      selectedSpecial === 'new'
        ? tags.includes('new')
        : tags.includes('sale') || (product.compare_price && product.compare_price > product.price)
    )
    return matchCategory && matchBrand && matchSpecial
  }))
  const colorSiblingsMap = buildColorSiblingsMap(products)
  const uahRate = locale === 'uk' ? await getUahRate() : undefined
  const basePath = `/${audience}`
  const hasActiveFilters = selectedCategory || selectedBrands.length > 0 || selectedSpecial

  function buildHref(next = {}) {
    const sp = new URLSearchParams()
    const category = Object.prototype.hasOwnProperty.call(next, 'category') ? next.category : selectedCategory
    const brand = Object.prototype.hasOwnProperty.call(next, 'brand') ? next.brand : selectedBrands
    const special = Object.prototype.hasOwnProperty.call(next, 'special') ? next.special : selectedSpecial
    if (category) sp.set('category', category)
    if (Array.isArray(brand)) brand.forEach(value => value && sp.append('brand', value))
    else if (brand) sp.append('brand', brand)
    if (special) sp.set('special', special)
    const qs = sp.toString()
    return pathForLocale(qs ? `${basePath}?${qs}` : basePath, locale)
  }

  return (
    <main style={{ background: '#fff', color: '#10100e' }}>
      <section className="audience-catalog-layout" style={{ maxWidth: 1440, margin: '0 auto', padding: '38px 24px 72px' }}>
        <aside className="audience-sidebar">
          <p style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 900, letterSpacing: '0.02em' }}>{copy.title}</p>
          <nav style={{ display: 'grid', gap: 13 }}>
            <Link href={pathForLocale(basePath, locale)} style={sideLink(!hasActiveFilters)}>{d.nav.allProducts}</Link>
            {categories.map(category => (
              <Link key={category} href={buildHref({ category })} style={sideLink(selectedCategory === category)}>
                {translateCategory(category, locale)}
              </Link>
            ))}
            <Link href={buildHref({ special: 'new', category: '' })} style={sideLink(selectedSpecial === 'new')}>{d.nav.newArrivals}</Link>
            <Link href={buildHref({ special: 'sale', category: '' })} style={sideLink(selectedSpecial === 'sale')}>{d.nav.sale}</Link>
          </nav>
        </aside>

        <div>
          <div className="audience-filter-bar">
            <Link href={buildHref({ special: selectedSpecial === 'new' ? '' : 'new' })} style={filterPill(selectedSpecial === 'new')}>
              {d.nav.newArrivals}
            </Link>
            <Link href={buildHref({ special: selectedSpecial === 'sale' ? '' : 'sale' })} style={filterPill(selectedSpecial === 'sale')}>
              {d.nav.sale}
            </Link>
            {brands.map(brand => {
              const brandId = String(brand.id)
              const isActive = selectedBrands.includes(brandId)
              const nextBrands = isActive ? selectedBrands.filter(id => id !== brandId) : [...selectedBrands, brandId]
              return (
                <Link key={brand.id} href={buildHref({ brand: nextBrands })} style={filterPill(isActive)}>
                  {brand.name}
                </Link>
              )
            })}
            {hasActiveFilters && (
              <Link href={pathForLocale(basePath, locale)} style={{ ...filterPill(false), color: '#666' }}>{d.products.clear}</Link>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, margin: '0 0 24px' }}>
            <span style={{ fontSize: 13, color: '#666', fontWeight: 700 }}>
              {visibleProducts.length} {d.products.items}
            </span>
          </div>

          {visibleProducts.length > 0 ? (
            <div className="products-grid">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  colorSiblings={colorSiblingsMap[product.id] || []}
                  imagePriority={index < 4}
                  locale={locale}
                  uahRate={uahRate}
                />
              ))}
            </div>
          ) : (
            <div style={{ padding: '80px 0', textAlign: 'center', color: '#65655c' }}>
              <p style={{ margin: '0 0 14px', fontSize: 16 }}>{d.products.noProducts}</p>
              <Link href={pathForLocale(basePath, locale)} style={{ color: '#10100e', fontWeight: 900 }}>
                {d.products.clearFilters}
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function sideLink(active) {
  return {
    color: active ? '#10100e' : '#222',
    textDecoration: 'none',
    fontSize: 15,
    lineHeight: 1.2,
    fontWeight: active ? 900 : 700,
  }
}

function filterPill(active) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 40,
    padding: '0 18px',
    border: `1px solid ${active ? '#10100e' : '#d4d6da'}`,
    borderRadius: 999,
    background: active ? '#10100e' : '#fff',
    color: active ? '#fff' : '#10100e',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  }
}
