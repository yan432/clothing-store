'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getMessages, localeFromPathname } from '../lib/i18n'
import { isMarketingTrackingDisabled } from '../lib/trackingFilter'

const STORAGE_KEY = 'cookie_consent'
const PREFS_KEY = 'cookie_consent_prefs'

// EEA + UK country codes (ISO 3166-1 alpha-2)
const EEA_COUNTRIES = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IS','IT','LI','LT','LU',
  'LV','MT','NL','NO','PL','PT','RO','SE','SI','SK','GB'
])

const DEFAULT_PREFS = { marketing: false, analytics: false, personalization: false }

function readPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {}
  // Fallback: derive from legacy single-flag storage so existing visitors
  // don't lose their previous choice
  const legacy = localStorage.getItem(STORAGE_KEY)
  if (legacy === 'granted') return { marketing: true, analytics: true, personalization: true }
  if (legacy === 'denied')  return { ...DEFAULT_PREFS }
  return null
}

function updateGAConsent({ analytics, marketing }) {
  if (typeof window === 'undefined') return
  if (isMarketingTrackingDisabled()) return
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }
  window.gtag('consent', 'update', {
    ad_storage:           marketing ? 'granted' : 'denied',
    analytics_storage:    analytics ? 'granted' : 'denied',
    ad_user_data:         marketing ? 'granted' : 'denied',
    ad_personalization:   marketing ? 'granted' : 'denied',
  })
  window.dispatchEvent(new CustomEvent('tracking-consent-change', {
    detail: { granted: marketing, analytics, marketing },
  }))
}

function updateMetaConsent(granted) {
  if (typeof window === 'undefined' || !window.fbq) return
  if (isMarketingTrackingDisabled()) return
  window.fbq('consent', granted ? 'grant' : 'revoke')
  if (granted && !window.__metaPageViewTracked) {
    window.fbq('track', 'PageView')
    window.__metaPageViewTracked = true
  }
}

function updateTikTokConsent(granted) {
  if (typeof window === 'undefined' || !window.ttq) return
  if (isMarketingTrackingDisabled()) return
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

function applyConsent(prefs) {
  updateGAConsent({ analytics: prefs.analytics, marketing: prefs.marketing })
  updateMetaConsent(prefs.marketing)
  updateTikTokConsent(prefs.marketing)
}

function persistPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    // Marketing is the gate used by track.js / fbq / ttq wrappers — keep the
    // legacy key in sync so those checks keep working
    localStorage.setItem(STORAGE_KEY, prefs.marketing ? 'granted' : 'denied')
  } catch {}
}

function isEEAVisitor() {
  // Timezone-based heuristic only — no external geo API.
  // External lookups (ipapi.co) get rate-limited (429) and hurt LCP/CLS,
  // and timezone covers virtually all real EEA visitors.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    return tz.startsWith('Europe/')
  } catch {
    return true // fail safe: show banner
  }
}

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width:      42,
        height:     24,
        background: checked ? '#1a1a18' : '#d4d4d2',
        borderRadius: 999,
        border:     'none',
        position:   'relative',
        cursor:     disabled ? 'not-allowed' : 'pointer',
        transition: 'background 150ms',
        opacity:    disabled ? 0.5 : 1,
        flexShrink: 0,
        padding:    0,
      }}
    >
      <span style={{
        position:   'absolute',
        top:        3,
        left:       checked ? 21 : 3,
        width:      18,
        height:     18,
        background: '#fff',
        borderRadius: '50%',
        transition: 'left 150ms',
        pointerEvents: 'none',
      }} />
    </button>
  )
}

function CategoryRow({ title, body, checked, onChange, disabled }) {
  return (
    <div style={{
      display:      'flex',
      gap:          20,
      padding:      '16px 0',
      borderBottom: '1px solid #ececea',
      alignItems:   'flex-start',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#1a1a18' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#666' }}>
          {body}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  )
}

export default function CookieConsent() {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const [visible, setVisible] = useState(false)
  const [view, setView] = useState('banner')  // 'banner' | 'settings'
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)

  useEffect(() => {
    const saved = readPrefs()
    if (saved) {
      applyConsent(saved)
      return
    }
    if (isEEAVisitor()) {
      const timer = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(timer)
    }
    // Non-EEA: auto-grant tracking so we don't re-check on every page
    const allGranted = { marketing: true, analytics: true, personalization: true }
    persistPrefs(allGranted)
    applyConsent(allGranted)
  }, [])

  function commit(next) {
    persistPrefs(next)
    applyConsent(next)
    setVisible(false)
  }

  function handleAcceptAll() {
    commit({ marketing: true, analytics: true, personalization: true })
  }

  function handleRejectAll() {
    commit({ marketing: false, analytics: false, personalization: false })
  }

  function handleSavePreferences() {
    commit(prefs)
  }

  function openSettings() {
    // Seed toggles from current saved prefs (if any) so reopening reflects state
    const saved = readPrefs()
    if (saved) setPrefs(saved)
    setView('settings')
  }

  if (!visible) return null

  const c = d.cookie

  return (
    <div style={{
      position:     'fixed',
      bottom:       0,
      left:         0,
      right:        0,
      background:   '#fff',
      color:        '#1a1a18',
      borderTop:    '1px solid #e5e5e3',
      padding:      view === 'settings' ? '24px 32px' : '28px 32px',
      zIndex:       9999,
      boxShadow:    '0 -8px 24px rgba(0,0,0,0.06)',
      maxHeight:    '80vh',
      overflowY:    'auto',
    }}>
      {view === 'banner' && (
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
              {c.title}
            </h2>
            <p style={{
              margin:    0,
              fontSize:  14,
              lineHeight: 1.55,
              color:     '#555',
              maxWidth:  720,
            }}>
              {c.body}{' '}
              <a href="/privacy" style={{ color: '#1a1a18', textDecoration: 'underline' }}>
                {c.privacy}
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
              onClick={handleAcceptAll}
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
              {c.accept}
            </button>
            <button
              onClick={openSettings}
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
              {c.configure}
            </button>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{
            margin:        '0 0 16px',
            fontSize:      15,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {c.settingsTitle}
          </h2>

          <div style={{ borderTop: '1px solid #ececea' }}>
            <CategoryRow
              title={c.necessary.title}
              body={c.necessary.body}
              checked={true}
              disabled
              onChange={() => {}}
            />
            <CategoryRow
              title={c.personalization.title}
              body={c.personalization.body}
              checked={prefs.personalization}
              onChange={(v) => setPrefs({ ...prefs, personalization: v })}
            />
            <CategoryRow
              title={c.marketing.title}
              body={c.marketing.body}
              checked={prefs.marketing}
              onChange={(v) => setPrefs({ ...prefs, marketing: v })}
            />
            <CategoryRow
              title={c.analytics.title}
              body={c.analytics.body}
              checked={prefs.analytics}
              onChange={(v) => setPrefs({ ...prefs, analytics: v })}
            />
          </div>

          <div style={{
            display:    'flex',
            gap:        16,
            marginTop:  20,
            flexWrap:   'wrap',
            alignItems: 'center',
          }}>
            <button
              onClick={handleSavePreferences}
              style={{
                background:    '#1a1a18',
                border:        'none',
                color:         '#fff',
                padding:       '12px 28px',
                fontSize:      14,
                fontWeight:    600,
                letterSpacing: '0.04em',
                cursor:        'pointer',
                minWidth:      180,
              }}
            >
              {c.save}
            </button>
            <button
              onClick={handleAcceptAll}
              style={{
                background:    'transparent',
                border:        '1px solid #1a1a18',
                color:         '#1a1a18',
                padding:       '12px 28px',
                fontSize:      14,
                fontWeight:    600,
                letterSpacing: '0.04em',
                cursor:        'pointer',
              }}
            >
              {c.acceptAll}
            </button>
            <button
              onClick={handleRejectAll}
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
              {c.rejectAll}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
