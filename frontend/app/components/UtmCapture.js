'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const TTL_MS   = 30 * 24 * 60 * 60 * 1000  // 30 days
const META_ATTRIBUTION_KEY = 'meta_attribution'

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  const found = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix))
  return found ? decodeURIComponent(found.slice(prefix.length)) : null
}

function cleanMetaCookieValue(value) {
  const text = String(value || '').trim()
  return text && text.startsWith('fb.') && text.length <= 500 ? text : null
}

function buildFbc(fbclid) {
  const clickId = String(fbclid || '').trim()
  if (!clickId) return null
  return `fb.1.${Date.now()}.${clickId}`
}

function getStoredMetaAttributionSnapshot() {
  try {
    const raw = localStorage.getItem(META_ATTRIBUTION_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    if (Date.now() > data.expires_at) {
      localStorage.removeItem(META_ATTRIBUTION_KEY)
      return {}
    }
    return data
  } catch {
    return {}
  }
}

/**
 * Reads UTM params from the URL on every page load.
 * Saves them to localStorage with a 30-day TTL (last-touch model).
 * Does nothing if no UTM params are present.
 */
export default function UtmCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const found = {}
    UTM_KEYS.forEach(key => {
      const val = searchParams.get(key)
      if (val) found[key] = val
    })
    if (Object.keys(found).length > 0) {
      localStorage.setItem('utm', JSON.stringify({
        ...found,
        captured_at: Date.now(),
        expires_at:  Date.now() + TTL_MS,
      }))
    }

    const stored = getStoredMetaAttributionSnapshot()
    const fbp = cleanMetaCookieValue(getCookie('_fbp')) || cleanMetaCookieValue(stored.fbp)
    const fbc = cleanMetaCookieValue(getCookie('_fbc')) || buildFbc(searchParams.get('fbclid')) || cleanMetaCookieValue(stored.fbc)
    if (fbp || fbc) {
      localStorage.setItem(META_ATTRIBUTION_KEY, JSON.stringify({
        ...(fbp ? { fbp } : {}),
        ...(fbc ? { fbc } : {}),
        captured_at: Date.now(),
        expires_at:  Date.now() + TTL_MS,
      }))
    }
  }, [searchParams])

  return null
}

/** Call this at checkout time to attach attribution to an order. */
export function getStoredUtm() {
  try {
    const raw = localStorage.getItem('utm')
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() > data.expires_at) {
      localStorage.removeItem('utm')
      return null
    }
    const { captured_at, expires_at, ...utm } = data
    return utm          // { utm_source, utm_medium, utm_campaign, … }
  } catch {
    return null
  }
}

/** Call this at checkout time to attach Meta Pixel/CAPI matching data to an order. */
export function getStoredMetaAttribution() {
  try {
    const stored = getStoredMetaAttributionSnapshot()
    const fbp = cleanMetaCookieValue(getCookie('_fbp')) || cleanMetaCookieValue(stored.fbp)
    const fbc = cleanMetaCookieValue(getCookie('_fbc')) || cleanMetaCookieValue(stored.fbc)
    const consent = localStorage.getItem('cookie_consent') || undefined
    const data = {
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(consent ? { consent } : {}),
    }
    return Object.keys(data).length ? data : null
  } catch {
    return null
  }
}
