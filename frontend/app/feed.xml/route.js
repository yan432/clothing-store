import { getApiUrl } from '../lib/api'

export async function GET() {
  const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
  const products = await res.json()

  const baseUrl = 'https://yourstore.com'

  const items = products.map(p => `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${p.name}</g:title>
      <g:description>${p.description || p.name}</g:description>
      <g:link>${baseUrl}/products/${p.id}</g:link>
      <g:image_link>${(Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url || ''}</g:image_link>
      <g:price>${p.price} USD</g:price>
      <g:availability>${p.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>STORE</g:brand>
      <g:google_product_category>Apparel &amp; Accessories</g:google_product_category>
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>STORE</title>
    <link>${baseUrl}</link>
    <description>Minimal clothing store</description>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}