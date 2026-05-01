'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cookie_consent'

// EEA + UK country codes (ISO 3166-1 alpha-2)
const EEA_COUNTRIES = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IS','IT','LI','LT','LU',
  'LV','MT','NL','NO','PL','PT','RO','SE','SI','SK','GB'
])

function updateGAConsent(granted) {
  if (typeof window === 'undefined' || !window.gtag) return
  const state = granted ? 'granted' : 'denied'
  window.gtag('consent', 'update', {
    ad_storage:           state,
    analytics_storage:    state,
    ad_user_data:         state,
    ad_personalization:   state,
  })
}

async function isEEAVisitor() {
  try {
    // Lightweight timezone-based heuristic (no external API needed)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    // European timezones all start with 'Europe/'
    if (tz.startsWith('Europe/')) return true
    // Fallback: check via a fast geo endpoint
    const res = await fetch('https://ipapi.co/country/', { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return true // fail safe: show banner
    const country = (await res.text()).trim().toUpperCase()
    return EEA_COUNTRIES.has(country)
  } catch {
    return true // fail safe: show banner
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      // Re-apply saved consent on every page load so GA respects it
      updateGAConsent(saved === 'granted')
      return
    }
    // Only show banner to EEA visitors
    isEEAVisitor().then(isEEA => {
      if (isEEA) {
        setVisible(true)
      } else {
        // Non-EEA: auto-grant analytics (already granted by default in layout.js)
        // Just mark as granted so we don't re-check on every page
        localStorage.setItem(STORAGE_KEY, 'granted')
      }
    })
  }, [])

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'granted')
    updateGAConsent(true)
    setVisible(false)
  }

  function handleDecline() {
    localStorage.setItem(STORAGE_KEY, 'denied')
    updateGAConsent(false)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 48px)',
      maxWidth: 560,
      background: '#111',
      color: '#fff',
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ margin: 0, fontSize: 13, color: '#ccc', flex: 1, minWidth: 200, lineHeight: 1.5 }}>
        We use cookies to analyse traffic and improve your experience.{' '}
        <a href="/privacy" style={{ color: '#fff', textDecoration: 'underline' }}>Privacy policy</a>
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleDecline}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            color: '#aaa',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            background: '#fff',
            border: 'none',
            color: '#111',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  )
}
