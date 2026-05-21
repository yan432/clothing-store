import { getApiUrl } from '../lib/api'
import { parseSizeOptionsFromTags } from '../lib/sizeOptions'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.edmclothes.net'
const BRAND = 'edm.clothes'
const SHIPPING_PRICE_EUR = 30
const FREE_SHIPPING_THRESHOLD_EUR = 120
const SHIPPING_COUNTRIES = ['DE', 'FR', 'NL', 'AT', 'GB', 'US']

// Exact strings from Google Product Taxonomy
// https://www.google.com/basepages/producttype/taxonomy.en-US.txt
const CATEGORY_TAXONOMY = {
  Tops:        'Apparel & Accessories > Clothing > Shirts & Tops',
  Bottoms:     'Apparel & Accessories > Clothing > Pants',
  Outerwear:   'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
  Accessories: 'Apparel & Accessories > Clothing Accessories',
  Knitwear:    'Apparel & Accessories > Clothing > Shirts & Tops',
  Denim:       'Apparel & Accessories > Clothing > Pants',
  Jackets:     'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildShipping(country) {
  return `<g:shipping>
        <g:country>${country}</g:country><g:service>Standard</g:service><g:price>${SHIPPING_PRICE_EUR.toFixed(2)} EUR</g:price>
      </g:shipping>
      <g:free_shipping_threshold>
        <g:country>${country}</g:country><g:price_threshold>${FREE_SHIPPING_THRESHOLD_EUR.toFixed(2)} EUR</g:price_threshold>
      </g:free_shipping_threshold>`
}

function buildItem(p, { id, size } = {}) {
  const slug        = p.slug || String(p.id)
  const itemId      = id || slug
  const stock       = p.available_stock ?? p.stock ?? 0
  const images      = Array.isArray(p.image_urls) && p.image_urls.length
    ? p.image_urls
    : p.image_url ? [p.image_url] : []
  const mainImage   = images[0] || ''
  const extraImages = images.slice(1, 10)
  const taxonomy    = CATEGORY_TAXONOMY[p.category] || 'Apparel & Accessories > Clothing'
  // Use slug/color_group_id directly (no prefix) so Pixel content_ids
  // from product pages match this value for Catalog Match Rate.
  const itemGroupId = p.color_group_id || p.slug || String(p.id)

  return `
    <item>
      <g:id>${esc(itemId)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(p.description || p.name)}</g:description>
      <g:link>${BASE_URL}/products/${esc(slug)}</g:link>
      <g:image_link>${esc(mainImage)}</g:image_link>
      ${extraImages.map(u => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('\n      ')}
      <g:price>${Number(p.price || 0).toFixed(2)} EUR</g:price>
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
      ${SHIPPING_COUNTRIES.map(buildShipping).join('\n      ')}
    </item>`
}

function buildAllItems(products) {
  const items = []
  for (const p of products) {
    if (p.is_hidden) continue
    const slug  = p.slug || String(p.id)
    const sizes = parseSizeOptionsFromTags(p.tags)

    if (sizes.length > 0) {
      for (const size of sizes) {
        const variantId = `${slug}-${size.replace(/\s+/g, '-').toLowerCase()}`
        items.push(buildItem(p, { id: variantId, size }))
      }
    } else {
      items.push(buildItem(p, { id: slug }))
    }
  }
  return items.join('')
}

export async function GET() {
  let products = []
  try {
    const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
    if (res.ok) products = await res.json()
  } catch {
    // return empty feed rather than 500
  }
  if (!Array.isArray(products)) products = []

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${BRAND}</title>
    <link>${BASE_URL}</link>
    <description>Minimal clothing store</description>
    ${buildAllItems(products)}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
