import { parseSizeOptionsFromTags } from './sizeOptions'
import { currencyForLocale, priceForLocale, eurToUah } from './money'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.edmclothes.net'
const BRAND = 'edm.clothes'

// Exact strings from Google Product Taxonomy
const CATEGORY_TAXONOMY = {
  Tops:        'Apparel & Accessories > Clothing > Shirts & Tops',
  Bottoms:     'Apparel & Accessories > Clothing > Pants',
  Outerwear:   'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
  Accessories: 'Apparel & Accessories > Clothing Accessories',
  Knitwear:    'Apparel & Accessories > Clothing > Shirts & Tops',
  Denim:       'Apparel & Accessories > Clothing > Pants',
  Jackets:     'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
}

// Per-locale feed settings. UAH feed targets Ukraine (Nova Poshta); EUR feed
// targets the EU/US shipping countries.
const FEED_CONFIG = {
  en: {
    pathPrefix: '',
    shippingCountries: ['DE', 'FR', 'NL', 'AT', 'GB', 'US'],
    shipPriceEur: 30,
    freeThresholdEur: 120,
  },
  uk: {
    pathPrefix: '/ua',
    shippingCountries: ['UA'],
    shipPriceEur: 30,      // converted to UAH below
    freeThresholdEur: 120, // converted to UAH below
  },
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtFeedPrice(amount, currencyCode) {
  return `${Number(amount || 0).toFixed(2)} ${currencyCode}`
}

function buildShipping(country, shipPrice, currencyCode, freeThreshold) {
  return `<g:shipping>
        <g:country>${country}</g:country><g:service>Standard</g:service><g:price>${fmtFeedPrice(shipPrice, currencyCode)}</g:price>
      </g:shipping>
      <g:free_shipping_threshold>
        <g:country>${country}</g:country><g:price_threshold>${fmtFeedPrice(freeThreshold, currencyCode)}</g:price_threshold>
      </g:free_shipping_threshold>`
}

function buildItem(p, { id, size, locale, rate, currencyCode, cfg, shipPrice, freeThreshold } = {}) {
  const slug        = p.slug || String(p.id)
  const itemId      = id || slug
  const stock       = p.available_stock ?? p.stock ?? 0
  const images      = Array.isArray(p.image_urls) && p.image_urls.length
    ? p.image_urls
    : p.image_url ? [p.image_url] : []
  const mainImage   = images[0] || ''
  const extraImages = images.slice(1, 10)
  const taxonomy    = CATEGORY_TAXONOMY[p.category] || 'Apparel & Accessories > Clothing'
  const itemGroupId = p.color_group_id || p.slug || String(p.id)
  const price       = priceForLocale(p, locale, rate)

  return `
    <item>
      <g:id>${esc(itemId)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(p.description || p.name)}</g:description>
      <g:link>${BASE_URL}${cfg.pathPrefix}/products/${esc(slug)}</g:link>
      <g:image_link>${esc(mainImage)}</g:image_link>
      ${extraImages.map(u => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('\n      ')}
      <g:price>${fmtFeedPrice(price, currencyCode)}</g:price>
      <g:availability>${stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:quantity_to_sell_on_facebook>${Math.max(0, Number(stock) || 0)}</g:quantity_to_sell_on_facebook>
      <g:condition>new</g:condition>
      <g:brand>${BRAND}</g:brand>
      <g:mpn>EDM-${p.id}</g:mpn>
      <g:google_product_category>${esc(taxonomy)}</g:google_product_category>
      <g:product_type>${esc(p.category || 'Clothing')}</g:product_type>
      <g:age_group>adult</g:age_group>
      <g:gender>unisex</g:gender>
      <g:item_group_id>${esc(itemGroupId)}</g:item_group_id>
      <g:color>${esc(p.color_name || 'See product page')}</g:color>
      ${size ? `<g:size>${esc(size)}</g:size>` : ''}
      ${cfg.shippingCountries.map(c => buildShipping(c, shipPrice, currencyCode, freeThreshold)).join('\n      ')}
    </item>`
}

export function buildFeedXml(products, { locale = 'en', rate } = {}) {
  const cfg = FEED_CONFIG[locale] || FEED_CONFIG.en
  const currencyCode = currencyForLocale(locale)
  const isUah = currencyCode === 'UAH'
  const shipPrice = isUah ? eurToUah(cfg.shipPriceEur, rate) : cfg.shipPriceEur
  const freeThreshold = isUah ? eurToUah(cfg.freeThresholdEur, rate) : cfg.freeThresholdEur

  const items = []
  for (const p of Array.isArray(products) ? products : []) {
    if (p.is_hidden) continue
    const slug  = p.slug || String(p.id)
    const sizes = parseSizeOptionsFromTags(p.tags)
    const common = { locale, rate, currencyCode, cfg, shipPrice, freeThreshold }
    if (sizes.length > 0) {
      for (const size of sizes) {
        const variantId = `${slug}-${size.replace(/\s+/g, '-').toLowerCase()}`
        items.push(buildItem(p, { id: variantId, size, ...common }))
      }
    } else {
      items.push(buildItem(p, { id: slug, ...common }))
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${BRAND}</title>
    <link>${BASE_URL}${cfg.pathPrefix}</link>
    <description>Minimal clothing store</description>
    ${items.join('')}
  </channel>
</rss>`
}
