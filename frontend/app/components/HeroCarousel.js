'use client'
import { useEffect, useRef, useState } from 'react'

export default function HeroCarousel({ slides, fullWidth = false }) {
  const total = slides?.length || 0
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef(null)
  const autoRef = useRef(null)

  function startAuto() {
    clearInterval(autoRef.current)
    autoRef.current = setInterval(() => setIdx(i => (i + 1) % total), 5000)
  }

  useEffect(() => {
    if (total <= 1) return
    startAuto()
    return () => clearInterval(autoRef.current)
  }, [total])

  function go(direction) {
    setIdx(i => (i + direction + total) % total)
    startAuto()
  }

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    clearInterval(autoRef.current)
  }
  function onTouchEnd(e) {
    if (touchStartX.current == null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(diff) > 48) go(diff > 0 ? -1 : 1)
    else startAuto()
  }

  if (!slides || total === 0) return null

  function renderSlide(s) {
    const inner = (
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1a18',
        overflow: 'hidden',
      }}>
        <img
          src={s.image}
          alt={s.title}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '32px 36px',
        }}>
          {s.label && <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', margin: '0 0 8px' }}>{s.label}</p>}
          {s.title && <h3 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 600, color: '#fff', margin: s.link_label ? '0 0 16px' : 0, lineHeight: 1.15 }}>{s.title}</h3>}
          {s.link_label && (
            <span style={{
              display: 'inline-block', alignSelf: 'flex-start',
              border: '1.5px solid rgba(255,255,255,0.8)', borderRadius: 6,
              padding: '8px 22px', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff',
            }}>{s.link_label}</span>
          )}
        </div>
      </div>
    )
    return s.href
      ? <a href={s.href} style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>{inner}</a>
      : <div style={{ width: '100%', height: '100%' }}>{inner}</div>
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 420,
        maxHeight: '82vh',
        aspectRatio: '21/9',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'pan-y',
        background: '#1a1a18',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Crossfade stack — every slide layered, opacity drives the transition */}
      {slides.map((s, i) => (
        <div
          key={i}
          aria-hidden={i !== idx}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: 'opacity 600ms ease-in-out',
            pointerEvents: i === idx ? 'auto' : 'none',
            willChange: 'opacity',
          }}
        >
          {renderSlide(s)}
        </div>
      ))}

      {total > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous"
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 2,
            }}>‹</button>
          <button onClick={() => go(1)} aria-label="Next"
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 2,
            }}>›</button>
        </>
      )}

      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => { setIdx(i); startAuto() }}
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
