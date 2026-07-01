import { cookies } from 'next/headers'
import { getApiUrl } from './api'

const SESSION_COOKIE = 'edm_sid'

// Per-session seed for stableRandomRank, so the tie-break order among
// products with no engagement data yet differs across visitors instead of
// being one fixed permutation for everyone. Falls back to '' (global,
// deterministic order) on a visitor's very first request, before the
// session cookie has been set client-side.
export async function getRankingSeed() {
  try {
    const store = await cookies()
    return store.get(SESSION_COOKIE)?.value || ''
  } catch {
    return ''
  }
}

export const AUDIENCE_COPY = {
  women: {
    en: {
      title: 'Women',
      kicker: 'Shop by fit, mood and movement',
      intro: 'A preview edit for womenswear shoppers: relaxed streetwear, denim, layers and accessories from the platform catalog.',
      metaTitle: 'Women — edm.clothes',
      description: 'Shop womenswear edits from edm.clothes: streetwear, denim, tops, bottoms and accessories from independent brands.',
    },
    uk: {
      title: 'Жінки',
      kicker: 'Добірка за посадкою, настроєм і рухом',
      intro: 'Тестова добірка для жіночого шопінгу: relaxed streetwear, денім, шари та аксесуари з каталогу платформи.',
      metaTitle: 'Жінки — edm.clothes',
      description: 'Жіноча добірка edm.clothes: streetwear, денім, верх, низ та аксесуари від незалежних брендів.',
    },
  },
  men: {
    en: {
      title: 'Men',
      kicker: 'Streetwear silhouettes and everyday uniform',
      intro: 'A preview edit for menswear shoppers: oversized tops, washed denim, utility bottoms and new arrivals from the platform catalog.',
      metaTitle: 'Men — edm.clothes',
      description: 'Shop menswear edits from edm.clothes: oversized tops, denim, bottoms and streetwear from independent brands.',
    },
    uk: {
      title: 'Чоловіки',
      kicker: 'Streetwear силуети та щоденна форма',
      intro: 'Тестова добірка для чоловічого шопінгу: оверсайз верх, washed denim, утилітарний низ та новинки з каталогу платформи.',
      metaTitle: 'Чоловіки — edm.clothes',
      description: 'Чоловіча добірка edm.clothes: оверсайз верх, денім, низ та streetwear від незалежних брендів.',
    },
  },
}

export async function getVisibleProducts(limit = 500) {
  try {
    const params = new URLSearchParams({ limit: String(limit), scope: 'marketplace' })
    const res = await fetch(getApiUrl(`/products?${params.toString()}`), { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    const products = Array.isArray(data) ? data : (data.products || [])
    return products.filter(p => !p.is_hidden && p.slug && !(p.name || '').startsWith('[ARCHIVED]'))
  } catch {
    return []
  }
}

export async function getPublicBrands() {
  try {
    const res = await fetch(getApiUrl('/brands'), { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function imageForProduct(product) {
  if (!product) return ''
  if (Array.isArray(product.image_urls) && product.image_urls[0]) return product.image_urls[0]
  return product.image_url || ''
}

export function productsForBrand(products, brand) {
  if (!brand) return []
  if (brand.id == null) return products.filter(product => product.brand_id == null)
  return products.filter(product => Number(product.brand_id) === Number(brand.id))
}

export function withPreviewBrands(brands, products) {
  if (brands.length) return brands
  const firstImage = imageForProduct(products[0])
  return [
    {
      id: null,
      slug: 'edm-clothes',
      name: 'edm.clothes',
      description: 'First-party pieces and platform anchor for the new multi-brand structure.',
      logo_url: '/brand/edm-logo-mark.png',
      cover_url: firstImage,
      sort_order: 0,
      is_preview_fallback: true,
    },
  ]
}

export function brandImage(brand, products = []) {
  if (brand?.cover_url) return brand.cover_url
  const firstProduct = productsForBrand(products, brand)[0] || products[0]
  return imageForProduct(firstProduct)
}

export function audienceMatches(product, audience) {
  if (audience === 'men' && product.is_menswear === false) return false
  if (audience === 'women' && product.is_womenswear === false) return false

  const tags = Array.isArray(product.tags) ? product.tags.map(tag => String(tag).toLowerCase()) : []
  const hasAudienceTag = tags.some(tag =>
    tag === 'men' ||
    tag === 'women' ||
    tag === 'mens' ||
    tag === 'womens' ||
    tag === 'unisex' ||
    tag.startsWith('audience:')
  )
  if (!hasAudienceTag) return true
  if (tags.includes('unisex')) return true
  return tags.includes(audience) || tags.includes(`${audience}s`) || tags.includes(`audience:${audience}`)
}

export function productsForAudience(products, audience) {
  return products.filter(product => audienceMatches(product, audience))
}

export function stableRandomRank(product, seed = '') {
  const input = `${seed}:${String(product?.id ?? product?.slug ?? product?.name ?? '')}`
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function getOrderMeta(product) {
  const tags = Array.isArray(product.tags) ? product.tags : []
  const priorityTag = tags.find(t => String(t).startsWith('order:priority:'))
  return {
    isFixed:  tags.includes('order:fixed'),
    isRandom: tags.includes('order:random'),
    priority: priorityTag ? Number(String(priorityTag).split('order:priority:')[1]) : null,
  }
}

// Same admin-override precedence as /products and /collections/[slug]:
// order:fixed (by priority) > order:random > everything else, which falls
// back to new-tag-first, then popularity_score, then created_at.
export function orderPreviewProducts(products, seed = '') {
  const randomRanks = new Map(products.map(p => [p.id, stableRandomRank(p, seed)]))
  return [...products].sort((a, b) => {
    const am = getOrderMeta(a), bm = getOrderMeta(b)
    const rank = m => m.isFixed ? 0 : m.isRandom ? 1 : 2
    const rd = rank(am) - rank(bm)
    if (rd !== 0) return rd
    if (am.isFixed && bm.isFixed) {
      const ap = am.priority ?? Number.MAX_SAFE_INTEGER
      const bp = bm.priority ?? Number.MAX_SAFE_INTEGER
      if (ap !== bp) return ap - bp
    }
    if (am.isRandom && bm.isRandom) return (randomRanks.get(a.id) || 0) - (randomRanks.get(b.id) || 0)

    const aNew = Array.isArray(a.tags) && a.tags.includes('new')
    const bNew = Array.isArray(b.tags) && b.tags.includes('new')
    if (aNew !== bNew) return aNew ? -1 : 1
    const sd = (Number(b.popularity_score) || 0) - (Number(a.popularity_score) || 0)
    if (sd !== 0) return sd
    const rr = (randomRanks.get(a.id) || 0) - (randomRanks.get(b.id) || 0)
    if (rr !== 0) return rr
    return (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0)
  })
}

export function buildColorSiblingsMap(products) {
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
    for (const member of members) map[member.id] = members.filter(sibling => sibling.id !== member.id)
  }
  return map
}
