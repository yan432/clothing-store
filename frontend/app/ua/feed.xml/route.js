import { getApiUrl } from '../../lib/api'
import { buildFeedXml } from '../../lib/productFeed'
import { getUahRate } from '../../lib/money'

export async function GET() {
  let products = []
  try {
    const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
    if (res.ok) products = await res.json()
  } catch {
    // return empty feed rather than 500
  }

  const rate = await getUahRate()
  const xml = buildFeedXml(products, { locale: 'uk', rate })

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
