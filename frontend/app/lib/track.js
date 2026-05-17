/**
 * Client-side event tracking.
 * Fire-and-forget — never throws, never blocks UI.
 */

function fbq(...args) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args)
  }
}

/**
 * Build a catalog content_id matching the feed format:
 *  - variant items (with size):       `${slug}-${size}` → matches g:id
 *  - product group (no size, e.g. ViewContent): `colorGroupId || slug` → matches g:item_group_id
 * Falls back to the numeric product id when no slug is available.
 */
export function catalogItemId({ slug, id, size, colorGroupId } = {}) {
  if (slug && size) {
    return `${slug}-${String(size).replace(/\s+/g, '-').toLowerCase()}`
  }
  return colorGroupId || slug || String(id || '')
}

import { getApiUrl } from './api'
import { getSessionId } from './session'

async function send(event_type, extra = {}) {
  if (typeof window === 'undefined') return
  try {
    await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        event_type,
        ...extra,
      }),
    })
  } catch {
    // silently ignore — tracking must never break the UI
  }
}

/**
 * User viewed a product page.
 * Pass { id, slug, colorGroupId } for accurate Catalog match.
 * Legacy: trackProductView(productId, email) still works.
 */
export function trackProductView(productOrId, email = null) {
  const product = (productOrId && typeof productOrId === 'object')
    ? productOrId
    : { id: productOrId }
  send('product_view', { product_id: product.id, email })
  const contentId = catalogItemId(product)
  if (contentId) {
    fbq('track', 'ViewContent', {
      content_ids:  [contentId],
      content_type: 'product',
    })
  }
}

/**
 * User added an item to cart.
 * Pass full product object (with slug + size) for accurate Catalog match.
 * Legacy: trackCartAdd(productId, email) still works.
 */
export function trackCartAdd(productOrId, email = null) {
  const product = (productOrId && typeof productOrId === 'object')
    ? productOrId
    : { id: productOrId }
  send('cart_add', { product_id: product.id, email })
  const contentId = catalogItemId(product)
  if (contentId) {
    fbq('track', 'AddToCart', {
      content_ids:  [contentId],
      content_type: 'product',
    })
  }
}

/** User reached the checkout confirmation step */
export function trackCheckoutStarted(email = null) {
  send('checkout_started', { email })
}

/** User logged in */
export function trackLogin(email) {
  send('login', { email })
}

/**
 * Fire GA4 purchase event after successful payment.
 * Call once on the /success page.
 * @param {{ orderId: string|number, total: number, currency?: string, items?: Array, utm?: object }} opts
 */
export function trackPurchase({ orderId, total, currency = 'EUR', items = [], utm = null }) {
  // Internal backend event
  send('purchase', { order_id: orderId, total })

  // Meta Pixel purchase event
  fbq('track', 'Purchase', {
    value:        Number(total),
    currency,
    content_ids:  items.map(i => catalogItemId({
      id:            i.product_id || i.id,
      slug:          i.slug || i.product_slug,
      size:          i.size,
      colorGroupId:  i.color_group_id,
    })).filter(Boolean),
    content_type: 'product',
  })

  // GA4 e-commerce purchase event
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    // Set campaign params so GA4 attributes the purchase to the right source.
    // This overrides the session source for this hit only.
    if (utm?.utm_source) {
      window.gtag('set', {
        campaign_source:  utm.utm_source,
        campaign_medium:  utm.utm_medium  || undefined,
        campaign_name:    utm.utm_campaign || undefined,
        campaign_content: utm.utm_content  || undefined,
        campaign_term:    utm.utm_term     || undefined,
      })
    }

    window.gtag('event', 'purchase', {
      transaction_id: String(orderId),
      value:          Number(total),
      currency,
      items: items.map((item, i) => ({
        item_id:   String(item.product_id || item.id || i),
        item_name: item.name || item.product_name || 'Product',
        quantity:  Number(item.quantity) || 1,
        price:     Number(item.price) || 0,
      })),
    })
  }
}
