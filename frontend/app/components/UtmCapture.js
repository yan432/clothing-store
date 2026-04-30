'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const TTL_MS   = 30 * 24 * 60 * 60 * 1000  // 30 days

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
    if (Object.keys(found).length === 0) return

    localStorage.setItem('utm', JSON.stringify({
      ...found,
      captured_at: Date.now(),
      expires_at:  Date.now() + TTL_MS,
    }))
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
