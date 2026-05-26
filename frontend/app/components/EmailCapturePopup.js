'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Mail, Sparkles } from 'lucide-react'
import { getApiUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { trackNewsletterPopupClose, trackNewsletterSignup } from '../lib/track'
import { getMessages, localeFromPathname } from '../lib/i18n'

const SESSION_KEY = 'email-popup-dismissed'

export default function EmailCapturePopup() {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const { user, loading: authLoading } = useAuth()
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)

  const canShow = useMemo(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem(SESSION_KEY)
  }, [])

  const forceShow = useMemo(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('popup') === '1'
  }, [])

  useEffect(() => {
    // Skip for logged-in users unless ?popup=1 is in the URL (for testing)
    if (!forceShow) {
      if (authLoading) return
      if (user) return
    }
    if (!canShow && !forceShow) return

    if (forceShow) {
      setVisible(true)
      return
    }

    const onScroll = () => {
      if (window.scrollY < 320) return
      setVisible(true)
      window.removeEventListener('scroll', onScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [canShow, user, authLoading, forceShow])

  function closePopup() {
    setVisible(false)
    if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1')
    trackNewsletterPopupClose({ source: 'scroll_popup' })
  }

  async function submit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch(getApiUrl('/email-subscribers/capture'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: 'scroll_popup',
          preferred_locale: locale,
          metadata: { offer: 'discount_10_percent', preferred_locale: locale },
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.already_subscribed) {
        trackNewsletterSignup({ source: 'scroll_popup', alreadySubscribed: true })
        setAlreadySubscribed(true)
      } else {
        trackNewsletterSignup({ source: 'scroll_popup' })
        setDone(true)
      }
    } catch (_) {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closePopup}
        style={{
          position: 'fixed', inset: 0, zIndex: 89,
          background: 'rgba(0,0,0,0.35)',
        }}
      />
      {/* Popup — centered on all screen sizes */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 90,
        width: 'min(380px, calc(100vw - 32px))',
        background: '#fff', border: '1px solid #ecece6',
        borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', padding: 28,
      }}>
      <button
        type="button"
        onClick={closePopup}
        aria-label={d.emailPopup.close}
        style={{ position: 'absolute', right: 10, top: 8, border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#666' }}
      >×</button>

      {done ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Mail size={32} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{d.emailPopup.doneTitle}</p>
          <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
            {d.emailPopup.doneText}
          </p>
        </div>
      ) : alreadySubscribed ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Sparkles size={32} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{d.emailPopup.subscribedTitle}</p>
          <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
            {d.emailPopup.subscribedText}
          </p>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>{d.emailPopup.title}</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666660' }}>
            {d.emailPopup.text}
          </p>
          <form id="newsletter-popup-form" name="newsletter_popup" onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              type="email"
              required
              placeholder={d.emailPopup.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, minWidth: 0 }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ border: 'none', background: '#111', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}
            >
              {loading ? '...' : d.emailPopup.button}
            </button>
          </form>
        </>
      )}
      </div>
    </>
  )
}
