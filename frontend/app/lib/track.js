/**
 * Client-side event tracking.
 * Fire-and-forget — never throws, never blocks UI.
 */

import { getApiUrl } from './api'
import { getSessionId } from './session'

const GA_MEASUREMENT_ID = 'G-CMVZYXVZ8Y'

function hasTrackingConsent() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('cookie_consent') === 'granted'
  } catch {
    return false
  }
}

function fbq(...args) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function' && hasTrackingConsent()) {
    window.fbq(...args)
  }
}

function ttq(method, ...args) {
  if (typeof window !== 'undefined' && typeof window.ttq === 'function' && hasTrackingConsent()) {
    window.ttq[method]?.(...args)
  }
}

function ttqItem(item = {}) {
  return {
    content_id:   catalogItemId({
      id:           item.product_id || item.id,
      slug:         item.slug || item.product_slug,
      size:         item.size,
      colorGroupId: item.color_group_id || item.colorGroupId,
    }) || String(item.product_id || item.id || ''),
    content_type: 'product',
    content_name: item.name || item.product_name || item.title || 'Product',
    price:        Number(item.price) || 0,
    quantity:     Number(item.quantity || item.qty) || 1,
  }
}

function ttqCartPayload(items = [], value = null) {
  const safeItems = Array.isArray(items) ? items : []
  return {
    contents: safeItems.map(ttqItem),
    value:    value == null ? cartValue(safeItems) : Number(value) || 0,
    currency: 'EUR',
  }
}

function ensureGtag() {
  if (typeof window === 'undefined') return

  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }
}

function syncGAConsentFromStorage() {
  if (!hasTrackingConsent()) return

  ensureGtag()
  window.gtag('consent', 'update', {
    ad_storage:           'granted',
    analytics_storage:    'granted',
    ad_user_data:         'granted',
    ad_personalization:   'granted',
  })
}

function gaEvent(name, params = {}) {
  if (typeof window === 'undefined') return

  ensureGtag()
  syncGAConsentFromStorage()
  window.gtag('event', name, {
    send_to: GA_MEASUREMENT_ID,
    ...params,
  })
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

function gaItem(item = {}, index = 0) {
  const itemId = catalogItemId({
    id:           item.product_id || item.id,
    slug:         item.slug || item.product_slug,
    size:         item.size,
    colorGroupId: item.color_group_id || item.colorGroupId,
  }) || String(item.product_id || item.id || index)

  return {
    item_id:       itemId,
    item_name:     item.name || item.product_name || item.title || 'Product',
    item_category: item.category || item.item_category || undefined,
    item_variant:  item.size || item.color_name || undefined,
    price:         Number(item.price) || 0,
    quantity:      Number(item.quantity || item.qty) || 1,
  }
}

function cartValue(items = []) {
  return items.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const qty = Number(item.quantity || item.qty) || 1
    return sum + price * qty
  }, 0)
}

function cartItems(items = []) {
  return items.map((item, index) => gaItem(item, index))
}

function metaItemId(item = {}) {
  return catalogItemId({
    id:           item.product_id || item.id,
    slug:         item.slug || item.product_slug,
    size:         item.size,
    colorGroupId: item.color_group_id || item.colorGroupId,
  })
}

function metaCartPayload(items = [], value = null) {
  const safeItems = Array.isArray(items) ? items : []
  return {
    value:        value == null ? cartValue(safeItems) : Number(value) || 0,
    currency:     'EUR',
    content_ids:  safeItems.map(metaItemId).filter(Boolean),
    content_type: 'product',
    num_items:    safeItems.reduce((sum, item) => sum + (Number(item.quantity || item.qty) || 1), 0),
  }
}

function metaPurchaseEventId(orderId) {
  const id = String(orderId || '').trim()
  return id && id !== 'unknown' ? `purchase-${id}` : null
}

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
  gaEvent('view_item', {
    currency: 'EUR',
    value:    Number(product.price) || 0,
    items:    [gaItem(product)],
  })
  const contentId = catalogItemId(product)
  if (contentId) {
    fbq('track', 'ViewContent', {
      content_ids:  [contentId],
      content_type: 'product',
    })
    ttq('track', 'ViewContent', {
      contents:  [ttqItem(product)],
      value:     Number(product.price) || 0,
      currency:  'EUR',
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
  gaEvent('add_to_cart', {
    currency: 'EUR',
    value:    (Number(product.price) || 0) * (Number(product.quantity || product.qty) || 1),
    items:    [gaItem(product)],
  })
  const contentId = catalogItemId(product)
  if (contentId) {
    fbq('track', 'AddToCart', {
      content_ids:  [contentId],
      content_type: 'product',
      value:        (Number(product.price) || 0) * (Number(product.quantity || product.qty) || 1),
      currency:     'EUR',
    })
    ttq('track', 'AddToCart', {
      contents: [ttqItem(product)],
      value:    (Number(product.price) || 0) * (Number(product.quantity || product.qty) || 1),
      currency: 'EUR',
    })
  }
}

export function trackViewCart(items = []) {
  gaEvent('view_cart', {
    currency: 'EUR',
    value:    cartValue(items),
    items:    cartItems(items),
  })
}

/** User reached checkout details */
export function trackCheckoutStarted(opts = null) {
  const options = (opts && typeof opts === 'object') ? opts : { email: opts }
  const items = options.cart || options.items || []
  send('checkout_started', { email: options.email || null })
  const cartTotal = Number(options.value) || cartValue(items)
  gaEvent('begin_checkout', {
    currency: 'EUR',
    value:    cartTotal,
    items:    cartItems(items),
  })
  // Google Ads conversion (event-based) — matches Begin Checkout action in AW-16809967064
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to:  'AW-16809967064/aPB6CJGBirEcENj7zs8-',
      value:    cartTotal,
      currency: 'EUR',
    })
  }
  fbq('track', 'InitiateCheckout', metaCartPayload(items, options.value))
  ttq('track', 'InitiateCheckout', ttqCartPayload(items, options.value))
}

/** User submitted shipping/contact details and moved to order review */
export function trackShippingInfo({ email = null, cart = [], value = null, shippingTier = null } = {}) {
  send('checkout_shipping_info', { email })
  gaEvent('add_shipping_info', {
    currency:      'EUR',
    value:         value == null ? cartValue(cart) : Number(value),
    shipping_tier: shippingTier || undefined,
    items:         cartItems(cart),
  })
}

/** User clicked the payment handoff button */
export function trackPaymentInfo({ email = null, cart = [], value = null, paymentType = 'Stripe' } = {}) {
  send('checkout_payment_info', { email })
  gaEvent('add_payment_info', {
    currency:     'EUR',
    value:        value == null ? cartValue(cart) : Number(value),
    payment_type: paymentType,
    items:        cartItems(cart),
  })
  fbq('track', 'AddPaymentInfo', {
    ...metaCartPayload(cart, value),
    payment_type: paymentType,
  })
  ttq('track', 'AddPaymentInfo', ttqCartPayload(cart, value))
}

/** User logged in */
export function trackLogin(email) {
  send('login', { email })
}

export function trackNewsletterSignup({ source = 'unknown', alreadySubscribed = false } = {}) {
  gaEvent('newsletter_signup', {
    source,
    already_subscribed: alreadySubscribed ? 'true' : 'false',
  })
  fbq('track', 'CompleteRegistration', {
    content_name: source,
    status:       alreadySubscribed ? 'already_subscribed' : 'subscribed',
  })
  ttq('track', 'CompleteRegistration', {})
}

export function trackCompleteRegistration({ source = 'account_signup', status = 'completed' } = {}) {
  fbq('track', 'CompleteRegistration', {
    content_name: source,
    status,
  })
  ttq('track', 'CompleteRegistration', {})
}

export function trackNewsletterPopupClose({ source = 'scroll_popup' } = {}) {
  gaEvent('newsletter_popup_close', { source })
}

export function trackAddToWishlist(product = {}) {
  const contentId = metaItemId(product)
  fbq('track', 'AddToWishlist', {
    ...(contentId ? { content_ids: [contentId] } : {}),
    content_type: 'product',
    value:        Number(product.price) || 0,
    currency:     'EUR',
  })
  ttq('track', 'AddToWishlist', {
    contents: [ttqItem(product)],
    value:    Number(product.price) || 0,
    currency: 'EUR',
  })
}

export function trackLead({ source = 'unknown', product = null } = {}) {
  fbq('track', 'Lead', {
    content_name: source,
    ...(product ? {
      content_ids:  [metaItemId(product)].filter(Boolean),
      content_type: 'product',
    } : {}),
  })
}

export function trackContact({ source = 'contact_form' } = {}) {
  fbq('track', 'Contact', { content_name: source })
}

export function trackSearch({ searchString = '', resultCount = null } = {}) {
  const q = String(searchString || '').trim()
  if (!q) return
  gaEvent('search', {
    search_term: q,
    results:     resultCount == null ? undefined : Number(resultCount),
  })
  fbq('track', 'Search', {
    search_string: q,
    content_category: 'Products',
  })
  ttq('track', 'Search', { search_string: q })
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
  const eventId = metaPurchaseEventId(orderId)
  const pixelPayload = {
    value:        Number(total),
    currency,
    content_ids:  items.map(metaItemId).filter(Boolean),
    content_type: 'product',
  }
  if (eventId) {
    fbq('track', 'Purchase', pixelPayload, { eventID: eventId })
  } else {
    fbq('track', 'Purchase', pixelPayload)
  }

  // TikTok Pixel purchase events
  const ttqPurchasePayload = {
    contents: items.map(ttqItem),
    value:    Number(total),
    currency,
  }
  ttq('track', 'PlaceAnOrder', ttqPurchasePayload)
  ttq('track', 'Purchase', ttqPurchasePayload)

  // GA4 e-commerce purchase event
  if (typeof window !== 'undefined') {
    ensureGtag()
    syncGAConsentFromStorage()

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

    // Google Ads conversion (event-based) — matches Purchase action in AW-16809967064
    window.gtag('event', 'conversion', {
      send_to:        'AW-16809967064/3IMZCKaYibEcENj7zs8-',
      value:          Number(total),
      currency,
      transaction_id: String(orderId || ''),
    })

    gaEvent('purchase', {
      transaction_id: String(orderId),
      value:          Number(total),
      currency,
      items: items.map((item, i) => ({
        ...gaItem(item, i),
      })),
    })
  }
}
