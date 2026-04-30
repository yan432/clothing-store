'use client'
import { useEffect, useState } from 'react'

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

  return (
    <section style={{
      background: '#111', color: '#fff',
      padding: '32px 24px',
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
    </section>
  )
}
