import { normalizeLocale, UK_LOCALE } from './i18n'
import { getApiUrl } from './api'

// Fallback exchange rate: 1 UAH -> EUR. Mirrors the backend
// DEFAULT_SHIPPING_CONFIG.uah_eur_rate (≈ 51.62 UAH per EUR).
// Pass the live rate from GET /shipping/config when available.
export const DEFAULT_UAH_EUR_RATE = 0.019372

export const CURRENCY_BY_LOCALE = { en: 'EUR', uk: 'UAH' }

export function currencyForLocale(locale) {
  return normalizeLocale(locale) === UK_LOCALE ? 'UAH' : 'EUR'
}

// Round a hryvnia amount UP to the nearest 100 ₴ so auto-converted
// prices look intentional (e.g. 1473 -> 1500) rather than 1473,82.
export function roundUah(amount) {
  const n = Number(amount || 0)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.ceil(n / 100) * 100
}

// Convert an EUR amount to UAH using a (1 UAH -> EUR) rate.
export function eurToUah(eur, rate = DEFAULT_UAH_EUR_RATE) {
  const r = Number(rate) > 0 ? Number(rate) : DEFAULT_UAH_EUR_RATE
  return roundUah(Number(eur || 0) / r)
}

function hasOverride(value) {
  return value != null && String(value).trim() !== '' && Number(value) > 0
}

// Resolve the amount to display/charge for a product in the active locale's
// currency. EUR -> product.price. UAH -> product.price_uah override if set,
// otherwise auto-convert product.price by the rate.
export function priceForLocale(product, locale, rate = DEFAULT_UAH_EUR_RATE) {
  const eur = Number(product?.price || 0)
  if (currencyForLocale(locale) !== 'UAH') return eur
  if (hasOverride(product?.price_uah)) return Number(product.price_uah)
  return eurToUah(eur, rate)
}

// Same resolution for the strikethrough "compare at" price.
export function comparePriceForLocale(product, locale, rate = DEFAULT_UAH_EUR_RATE) {
  const eur = Number(product?.compare_price || 0)
  if (!eur) return 0
  if (currencyForLocale(locale) !== 'UAH') return eur
  if (hasOverride(product?.compare_price_uah)) return Number(product.compare_price_uah)
  return eurToUah(eur, rate)
}

// Group integer digits with thin spaces, computed deterministically so SSR and
// client render identically (Intl.NumberFormat can differ across environments).
function groupThousands(intStr) {
  return String(intStr).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Format a numeric amount in the given currency.
//   EUR -> "€49.00"   (symbol prefix, dot decimals — matches existing UI)
//   UAH -> "1 490 ₴"  (symbol suffix, space-grouped, no decimals)
export function formatPrice(amount, currency = 'EUR') {
  const n = Number(amount || 0)
  if (currency === 'UAH') {
    return `${groupThousands(Math.round(n))} ₴`
  }
  return `€${n.toFixed(2)}`
}

// Convenience: resolve + format a product's price for a locale in one call.
export function formatProductPrice(product, locale, rate = DEFAULT_UAH_EUR_RATE) {
  return formatPrice(priceForLocale(product, locale, rate), currencyForLocale(locale))
}

// Convenience for plain amounts already known to be in a locale's currency.
export function formatAmountForLocale(amount, locale) {
  return formatPrice(amount, currencyForLocale(locale))
}

function parseRate(value) {
  const r = Number(value)
  return Number.isFinite(r) && r > 0 ? r : DEFAULT_UAH_EUR_RATE
}

// Server-side: fetch the live (1 UAH -> EUR) rate from the public shipping
// config. Falls back to DEFAULT_UAH_EUR_RATE on any error. Cached for 5 min.
export async function getUahRate() {
  try {
    const res = await fetch(getApiUrl('/shipping/config'), { next: { revalidate: 300 } })
    if (!res.ok) return DEFAULT_UAH_EUR_RATE
    const cfg = await res.json()
    return parseRate(cfg?.uah_eur_rate)
  } catch {
    return DEFAULT_UAH_EUR_RATE
  }
}
