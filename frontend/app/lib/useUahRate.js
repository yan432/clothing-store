'use client'
import { useEffect, useState } from 'react'
import { getApiUrl } from './api'
import { DEFAULT_UAH_EUR_RATE } from './money'

// Module-scoped cache so the rate is fetched at most once per page load and
// shared across every component that calls the hook.
let cachedRate = null
let inflight = null

function fetchRate() {
  if (cachedRate != null) return Promise.resolve(cachedRate)
  if (inflight) return inflight
  inflight = fetch(getApiUrl('/shipping/config'))
    .then(res => (res.ok ? res.json() : null))
    .then(cfg => {
      const r = Number(cfg?.uah_eur_rate)
      cachedRate = Number.isFinite(r) && r > 0 ? r : DEFAULT_UAH_EUR_RATE
      return cachedRate
    })
    .catch(() => {
      cachedRate = DEFAULT_UAH_EUR_RATE
      return cachedRate
    })
    .finally(() => { inflight = null })
  return inflight
}

// Returns the live (1 UAH -> EUR) rate, defaulting to DEFAULT_UAH_EUR_RATE
// until the fetch resolves. Only fetches when the active locale is Ukrainian.
export function useUahRate(enabled = true) {
  const [rate, setRate] = useState(cachedRate ?? DEFAULT_UAH_EUR_RATE)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    fetchRate().then(r => { if (alive) setRate(r) })
    return () => { alive = false }
  }, [enabled])
  return rate
}
