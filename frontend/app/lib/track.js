/**
 * Client-side event tracking.
 * Fire-and-forget — never throws, never blocks UI.
 */

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

/** User viewed a product page */
export function trackProductView(productId, email = null) {
  send('product_view', { product_id: productId, email })
}

/** User added an item to cart */
export function trackCartAdd(productId, email = null) {
  send('cart_add', { product_id: productId, email })
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
 * @param {{ orderId: string|number, total: number, currency?: string, items?: Array }} opts
 */
export function trackPurchase({ orderId, total, currency = 'EUR', items = [] }) {
  // Internal backend event
  send('purchase', { order_id: orderId, total })

  // GA4 e-commerce purchase event
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
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
