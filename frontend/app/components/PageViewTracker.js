'use client'

import { useEffect } from 'react'
import { getApiUrl } from '../lib/api'

const SESSION_KEY = 'edm_pv_session'

function getOrCreateSessionId() {
  if (typeof window === 'undefined') return null
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

export default function PageViewTracker({ pageType, entityId }) {
  useEffect(() => {
    if (!entityId) return
    if (typeof window === 'undefined') return
    const session_id = getOrCreateSessionId()
    const referrer = document.referrer || null
    const body = JSON.stringify({ page_type: pageType, entity_id: Number(entityId), session_id, referrer })
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(getApiUrl('/page-views'), blob)
        return
      }
    } catch {}
    fetch(getApiUrl('/page-views'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }, [pageType, entityId])

  return null
}
