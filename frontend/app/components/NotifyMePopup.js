'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { getApiUrl } from '../lib/api'

export default function NotifyMePopup({ product, size, initialEmail = '', onClose }) {
  const [email, setEmail]   = useState(initialEmail)
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch(getApiUrl('/waitlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          product_id: product.id,
          size,
        }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.4)',
        }}
      />

      {/* Popup */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 999,
        width: 'min(380px, calc(100vw - 32px))',
        background: '#fff',
        borderRadius: 16,
        padding: 28,
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none',
            fontSize: 20, color: '#999', cursor: 'pointer', lineHeight: 1,
          }}
        >×</button>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><CheckCircle2 size={48} strokeWidth={1.5} color="#16a34a" /></div>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>You're on the list!</p>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 20px', lineHeight: 1.5 }}>
              We'll email you as soon as <strong>{product.name}</strong> in size <strong>{size}</strong> is back in stock.
            </p>
            <button
              onClick={onClose}
              style={{
                background: '#111', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 24px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Notify me when available
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{product.name}</p>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 20px' }}>Size: <strong>{size}</strong></p>

            <p style={{ fontSize: 14, color: '#555', margin: '0 0 16px', lineHeight: 1.5 }}>
              Leave your email and we'll notify you the moment this size is back in stock.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                style={{
                  border: '1px solid #ddd', borderRadius: 10,
                  padding: '12px 14px', fontSize: 16,
                  outline: 'none',
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
                {status === 'loading' ? 'Saving...' : 'Notify me'}
              </button>
              {status === 'error' && (
                <p style={{ fontSize: 13, color: '#b91c1c', margin: 0, textAlign: 'center' }}>
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </>
  )
}
