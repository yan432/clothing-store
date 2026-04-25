'use client'
import { useEffect, useRef, useState } from 'react'

export default function HeroCarousel({ slides }) {
  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartX = useRef(null)
  const autoRef = useRef(null)

  const total = slides.length

  function go(next) {
    setIdx((next + total) % total)
  }

  // Auto-advance every 5s
  useEffect(() => {
    autoRef.current = setInterval(() => go(idx + 1), 5000)
    return () => clearInterval(autoRef.current)
  }, [idx])

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    setDragging(true)
    setDrag(0)
    clearInterval(autoRef.current)
  }
  function onTouchMove(e) {
    if (touchStartX.current == null) return
    setDrag(e.touches[0].clientX - touchStartX.current)
  }
  function onTouchEnd(e) {
    const diff = e.changedTouches[0].clientX - (touchStartX.current ?? 0)
    touchStartX.current = null
    setDragging(false)
    setDrag(0)
    if (Math.abs(diff) > 48) go(idx + (diff > 0 ? -1 : 1))
  }

  if (!slides || total === 0) return null

  return (
    <div
      style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '0 0 28px 28px', userSelect: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Track */}
      <div style={{
        display: 'flex',
        transform: `translateX(calc(${-idx * 100}% + ${drag}px))`,
        transition: dragging ? 'none' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}>
        {slides.map((s, i) => (
          <a key={i} href={s.href} style={{ flex: '0 0 100%', display: 'block', textDecoration: 'none' }}>
            <div style={{
              position: 'relative',
              minHeight: 420,
              maxHeight: '82vh',
              background: '#1a1a18',
              overflow: 'hidden',
            }}>
              <img
                src={s.image}
                alt={s.title}
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', aspectRatio: '21/9', minHeight: 420 }}
              />
              {/* Gradient + caption */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                padding: '32px 36px',
              }}>
                {s.label && <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', margin: '0 0 8px' }}>{s.label}</p>}
                <h3 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 600, color: '#fff', margin: '0 0 16px', lineHeight: 1.15 }}>{s.title}</h3>
                <span style={{
                  display: 'inline-block', alignSelf: 'flex-start',
                  border: '1.5px solid rgba(255,255,255,0.8)', borderRadius: 6,
                  padding: '8px 22px', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff',
                }}>Shop now</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Arrow buttons */}
      {total > 1 && (
        <>
          <button onClick={() => { clearInterval(autoRef.current); go(idx - 1) }} aria-label="Previous"
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>‹</button>
          <button onClick={() => { clearInterval(autoRef.current); go(idx + 1) }} aria-label="Next"
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>›</button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => { clearInterval(autoRef.current); setIdx(i) }}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.45)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 300ms ease',
              }} />
          ))}
        </div>
      )}
    </div>
  )
}
