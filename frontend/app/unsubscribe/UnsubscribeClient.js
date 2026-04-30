'use client'

import { useState } from 'react'
import { getApiUrl } from '../lib/api'

export default function UnsubscribeClient({ email: initialEmail }) {
  const [email, setEmail]   = useState(initialEmail || '')
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch(getApiUrl('/email-subscribers/unsubscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 24px',
    }}>
      {status === 'done' ? (
        <>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>✓</p>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>You've been unsubscribed</h1>
          <p style={{ fontSize: 15, color: '#888', margin: '0 0 32px', maxWidth: 340, lineHeight: 1.6 }}>
            <strong>{email}</strong> has been removed from our mailing list. You won't receive any more newsletters from us.
          </p>
          <a href="/products" style={{ background: '#111', color: '#fff', padding: '12px 28px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Continue shopping
          </a>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Unsubscribe</h1>
          <p style={{ fontSize: 15, color: '#888', margin: '0 0 28px', maxWidth: 340, lineHeight: 1.6 }}>
            Enter your email address to unsubscribe from EDM Clothes newsletters.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                border: '1px solid #ddd', borderRadius: 10,
                padding: '12px 16px', fontSize: 16,
                outline: 'none', textAlign: 'center',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                background: '#111', color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 24px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? 'Processing...' : 'Unsubscribe'}
            </button>
            {status === 'error' && (
              <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>
                Something went wrong. Please try again or contact us at{' '}
                <a href="mailto:sales@edmclothes.net" style={{ color: '#b91c1c' }}>sales@edmclothes.net</a>.
              </p>
            )}
          </form>
        </>
      )}
    </main>
  )
}
