'use client'

import { useEffect, useRef } from 'react'
import { getApiUrl } from '../lib/api'
import { getSessionId } from '../lib/session'
import { getStoredUtm } from './UtmCapture'

const MIN_DURATION_MS = 500

function beacon(path, body) {
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(getApiUrl(path), new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {}
  fetch(getApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export default function PageViewTracker({ pageType, entityId }) {
  const visibleSinceRef = useRef(null)
  const accumulatedRef = useRef(0)

  useEffect(() => {
    if (!entityId) return
    if (typeof window === 'undefined') return

    const session_id = getSessionId()
    const referrer = document.referrer || null
    const utm = getStoredUtm()

    beacon('/page-views', JSON.stringify({
      page_type: pageType,
      entity_id: Number(entityId),
      session_id,
      referrer,
      utm,
    }))

    // Dwell time: accumulate visible time (paused while the tab is hidden),
    // flush on hide/unload. Best-effort — never blocks navigation.
    visibleSinceRef.current = Date.now()
    accumulatedRef.current = 0

    function flush() {
      if (visibleSinceRef.current != null) {
        accumulatedRef.current += Date.now() - visibleSinceRef.current
        visibleSinceRef.current = null
      }
      if (accumulatedRef.current < MIN_DURATION_MS) return
      beacon('/page-views/duration', JSON.stringify({
        page_type: pageType,
        entity_id: Number(entityId),
        session_id,
        duration_ms: accumulatedRef.current,
      }))
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        flush()
      } else {
        visibleSinceRef.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flush)

    return () => {
      flush()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flush)
    }
  }, [pageType, entityId])

  return null
}
