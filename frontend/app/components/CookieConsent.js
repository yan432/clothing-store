'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cookie_consent'

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

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      setVisible(true)
    } else {
      // Re-apply saved consent on every page load so GA respects it
      updateGAConsent(saved === 'granted')
    }
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
