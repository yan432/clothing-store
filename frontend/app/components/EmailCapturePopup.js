'use client'

import { useEffect, useMemo, useState } from 'react'
import { getApiUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const SESSION_KEY = 'email-popup-dismissed'

export default function EmailCapturePopup() {
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
          metadata: { offer: 'discount_10_percent' },
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.already_subscribed) {
        setAlreadySubscribed(true)
      } else {
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
    <div style={{
      position: 'fixed', right: 18, bottom: 18, zIndex: 90,
      width: 'min(360px, calc(100vw - 24px))',
      background: '#fff', border: '1px solid #ecece6',
      borderRadius: 14, boxShadow: '0 18px 44px rgba(0,0,0,0.12)', padding: 20,
    }}>
      <button
        type="button"
        onClick={closePopup}
        aria-label="Close popup"
        style={{ position: 'absolute', right: 10, top: 8, border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#666' }}
      >×</button>

      {done ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: 28, margin: '0 0 8px' }}>✉️</p>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Check your email</p>
          <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
            We sent your personal discount code to your inbox.
          </p>
        </div>
      ) : alreadySubscribed ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: 28, margin: '0 0 8px' }}>👋</p>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Already subscribed</p>
          <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
            This email is already on the list — check your inbox for your discount code.
          </p>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Get 10% off</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666660' }}>
            Leave your email and get a discount code.
          </p>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, minWidth: 0 }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ border: 'none', background: '#111', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}
            >
              {loading ? '...' : 'Get code'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
