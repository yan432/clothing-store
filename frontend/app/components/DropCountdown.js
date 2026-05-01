'use client'
import { useEffect, useState } from 'react'
import { getApiUrl } from '../lib/api'

function pad(n) { return String(n).padStart(2, '0') }

function calc(target) {
  const diff = target - Date.now()
  if (diff <= 0) return null
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  }
}

export default function DropCountdown({ targetDate, label = 'New Drop' }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [subState, setSubState] = useState('idle') // idle | loading | done | error
  const [subError, setSubError] = useState('')

  useEffect(() => {
    setMounted(true)
    const target = new Date(targetDate).getTime()
    setTimeLeft(calc(target))
    const id = setInterval(() => setTimeLeft(calc(target)), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  // Avoid hydration mismatch; hide when expired
  if (!mounted || !timeLeft) return null

  const units = [
    { v: timeLeft.d, l: 'Days' },
    { v: timeLeft.h, l: 'Hours' },
    { v: timeLeft.m, l: 'Min' },
    { v: timeLeft.s, l: 'Sec' },
  ]

  async function handleNotify(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSubState('loading')
    setSubError('')
    try {
      const res = await fetch(getApiUrl('/email-subscribers/capture'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'drop_timer' }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setSubState('done')
    } catch (err) {
      setSubError(err.message || 'Something went wrong')
      setSubState('error')
    }
  }

  return (
    <section style={{
      background: '#111', color: '#fff',
      padding: '32px 24px 40px',
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.45)', margin: '0 0 20px',
      }}>
        {label}
      </p>

      <div style={{ display: 'flex', gap: 0, justifyContent: 'center', alignItems: 'flex-start' }}>
        {units.map(({ v, l }, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {i > 0 && (
              <span style={{
                fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 300,
                color: 'rgba(255,255,255,0.25)', padding: '0 8px',
                lineHeight: 1.05,
              }}>:</span>
            )}
            <div style={{ textAlign: 'center', minWidth: 64 }}>
              <div style={{
                fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 700,
                lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
              }}>
                {pad(v)}
              </div>
              <div style={{
                fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)', marginTop: 8,
              }}>
                {l}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email notify */}
      <div style={{ marginTop: 32, maxWidth: 380, margin: '32px auto 0' }}>
        {subState === 'done' ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            ✓ We'll let you know when it drops.
          </p>
        ) : (
          <form onSubmit={handleNotify} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                flex: '1 1 200px', minWidth: 0,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 999,
                padding: '10px 16px',
                fontSize: 13,
                color: '#fff',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={subState === 'loading'}
              style={{
                background: '#fff', color: '#111',
                border: 'none', borderRadius: 999,
                padding: '10px 20px',
                fontSize: 13, fontWeight: 600,
                cursor: subState === 'loading' ? 'default' : 'pointer',
                opacity: subState === 'loading' ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {subState === 'loading' ? '…' : 'Notify me'}
            </button>
          </form>
        )}
        {subState === 'error' && (
          <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{subError}</p>
        )}
      </div>
    </section>
  )
}
