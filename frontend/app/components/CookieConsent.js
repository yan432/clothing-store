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
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }
  const state = granted ? 'granted' : 'denied'
  window.gtag('consent', 'update', {
    ad_storage:           state,
    analytics_storage:    state,
    ad_user_data:         state,
    ad_personalization:   state,
  })
  window.dispatchEvent(new CustomEvent('tracking-consent-change', {
    detail: { granted },
  }))
}

function updateMetaConsent(granted) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('consent', granted ? 'grant' : 'revoke')
  if (granted && !window.__metaPageViewTracked) {
    window.fbq('track', 'PageView')
    window.__metaPageViewTracked = true
  }
}

function updateTikTokConsent(granted) {
  if (typeof window === 'undefined' || !window.ttq) return
  if (granted) {
    window.ttq.grantConsent()
    if (!window.__ttqPageViewTracked) {
      window.ttq.page()
      window.__ttqPageViewTracked = true
    }
  } else {
    window.ttq.revokeConsent()
  }
}

function updateTrackingConsent(granted) {
  updateGAConsent(granted)
  updateMetaConsent(granted)
  updateTikTokConsent(granted)
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
      // Re-apply saved consent on every page load so analytics/ad tags respect it
      updateTrackingConsent(saved === 'granted')
      return
    }
    // Only show banner to EEA visitors
    isEEAVisitor().then(isEEA => {
      if (isEEA) {
        setVisible(true)
      } else {
        // Non-EEA: auto-grant tracking and mark it so we don't re-check on every page
        localStorage.setItem(STORAGE_KEY, 'granted')
        updateTrackingConsent(true)
      }
    })
  }, [])

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'granted')
    updateTrackingConsent(true)
    setVisible(false)
  }

  function handleDecline() {
    localStorage.setItem(STORAGE_KEY, 'denied')
    updateTrackingConsent(false)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position:     'fixed',
      bottom:       0,
      left:         0,
      right:        0,
      background:   '#fff',
      color:        '#1a1a18',
      borderTop:    '1px solid #e5e5e3',
      padding:      '28px 32px',
      zIndex:       9999,
      boxShadow:    '0 -8px 24px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        maxWidth:   1400,
        margin:     '0 auto',
        display:    'flex',
        alignItems: 'center',
        gap:        32,
        flexWrap:   'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{
            margin:        '0 0 8px',
            fontSize:      15,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Cookie consent
          </h2>
          <p style={{
            margin:    0,
            fontSize:  14,
            lineHeight: 1.55,
            color:     '#555',
            maxWidth:  720,
          }}>
            We and our partners use cookies and similar technologies to personalise your
            experience, show you relevant content, measure ads and run analytics. We only use
            them with your consent. Read more in our{' '}
            <a href="/privacy" style={{ color: '#1a1a18', textDecoration: 'underline' }}>
              Privacy Policy
            </a>.
          </p>
        </div>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        24,
          flexShrink: 0,
          flexWrap:   'wrap',
        }}>
          <button
            onClick={handleAccept}
            style={{
              background:    '#1a1a18',
              border:        'none',
              color:         '#fff',
              padding:       '14px 36px',
              fontSize:      14,
              fontWeight:    600,
              letterSpacing: '0.04em',
              cursor:        'pointer',
              minWidth:      180,
            }}
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            style={{
              background:     'transparent',
              border:         'none',
              color:          '#555',
              fontSize:       14,
              fontWeight:     500,
              cursor:         'pointer',
              textDecoration: 'underline',
              padding:        0,
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
