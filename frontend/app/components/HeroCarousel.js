'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function HeroCarousel({ slides, fullWidth = false }) {
  const total = slides?.length || 0
  // 1-based: 0 = clone of last, 1..total = real, total+1 = clone of first
  const [idx, setIdx] = useState(1)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartX = useRef(null)
  const trackRef = useRef(null)
  const autoRef = useRef(null)
  const silentJump = useRef(false)

  const realIdx = idx === 0 ? total - 1 : idx === total + 1 ? 0 : idx - 1

  function startAuto() {
    clearInterval(autoRef.current)
    autoRef.current = setInterval(() => setIdx(i => i + 1), 5000)
  }

  useEffect(() => {
    startAuto()
    return () => clearInterval(autoRef.current)
  }, [])

  // Runs synchronously after DOM update, before browser paint —
  // disables transition so the position reset is invisible
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el || !silentJump.current) return
    silentJump.current = false
    el.style.transition = 'none'
    el.getBoundingClientRect() // force reflow so the new transform is committed
    requestAnimationFrame(() => {
      if (trackRef.current) trackRef.current.style.transition = ''
    })
  }, [idx])

  function onTransitionEnd(e) {
    // Ignore events bubbling from child elements or non-transform properties
    if (e.target !== trackRef.current || e.propertyName !== 'transform') return
    if (idx === 0) {
      silentJump.current = true
      setIdx(total)
    } else if (idx === total + 1) {
      silentJump.current = true
      setIdx(1)
    }
  }

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
    if (Math.abs(diff) > 48) {
      setIdx(i => i + (diff > 0 ? -1 : 1))
      startAuto()
    }
  }

  if (!slides || total === 0) return null

  const extended = [slides[total - 1], ...slides, slides[0]]

  function renderSlide(s, key) {
    const inner = (
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
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block', aspectRatio: '21/9', minHeight: 420 }}
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
      ? <a key={key} href={s.href} style={{ flex: '0 0 100%', display: 'block', textDecoration: 'none' }}>{inner}</a>
      : <div key={key} style={{ flex: '0 0 100%' }}>{inner}</div>
  }

  return (
    <div
      style={{ position: 'relative', width: '100%', overflow: 'hidden', userSelect: 'none', touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        ref={trackRef}
        onTransitionEnd={onTransitionEnd}
        style={{
          display: 'flex',
          transform: `translateX(calc(${-idx * 100}% + ${drag}px))`,
          transition: dragging ? 'none' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      >
        {extended.map((s, i) => renderSlide(s, i))}
      </div>

      {total > 1 && (
        <>
          <button onClick={() => { setIdx(i => i - 1); startAuto() }} aria-label="Previous"
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>‹</button>
          <button onClick={() => { setIdx(i => i + 1); startAuto() }} aria-label="Next"
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>›</button>
        </>
      )}

      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => { setIdx(i + 1); startAuto() }}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === realIdx ? 20 : 6, height: 6, borderRadius: 3,
                background: i === realIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 300ms ease',
              }} />
          ))}
        </div>
      )}
    </div>
  )
}
