'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

/**
 * Hero carousel with a sliding window of 5 slides (current + 2 each side).
 *
 * Key idea: `step` is an unbounded integer counter. Each "next" increments it,
 * each "prev" decrements it. Track translates by `-step * 100%`. We render a
 * window of slides at integer positions around `step`; each slide's content is
 * `slides[step+offset mod total]`. The track therefore ALWAYS moves in the
 * same direction for "next" — there is no wrap, no clone, no silent jump.
 * After the last real slide, the next slide rendered to the right is just
 * `slides[0]`, and the animation is identical to any other forward step.
 *
 * Slides outside the ±2 window are unmounted (preloads only 2 each side).
 */
export default function HeroCarousel({ slides, fullWidth = false }) {
  const total = slides?.length || 0
  const [step, setStep] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartX = useRef(null)
  const autoRef = useRef(null)

  const realIdx = total > 0 ? ((step % total) + total) % total : 0

  const startAuto = useCallback(() => {
    clearInterval(autoRef.current)
    if (total <= 1) return
    autoRef.current = setInterval(() => setStep(s => s + 1), 5000)
  }, [total])

  useEffect(() => {
    startAuto()
    return () => clearInterval(autoRef.current)
  }, [startAuto])

  function go(direction) {
    setStep(s => s + direction)
    startAuto()
  }

  function goToIdx(targetIdx) {
    if (total <= 1) return
    let diff = targetIdx - realIdx
    // Choose shortest signed direction
    if (diff > total / 2) diff -= total
    else if (diff < -total / 2) diff += total
    if (diff === 0) return
    setStep(s => s + diff)
    startAuto()
  }

  function onTouchStart(e) {
    if (total <= 1) return
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
    if (touchStartX.current == null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    setDragging(false)
    setDrag(0)
    if (Math.abs(diff) > 48) go(diff > 0 ? -1 : 1)
    else startAuto()
  }

  if (!slides || total === 0) return null

  // Window: current + 2 each side. For total === 1 we just render the single
  // slide; for total === 2 a window of [-1,0,1] is enough but [-2..2] is fine
  // too (the duplicate ends up off-screen).
  const offsets = total > 1 ? [-2, -1, 0, 1, 2] : [0]

  function renderSlideContent(s, isActive = false) {
    return (
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1a18',
        overflow: 'hidden',
      }}>
        <Image
          src={s.image}
          alt={s.title}
          fill
          sizes="100vw"
          quality={75}
          draggable={false}
          loading="lazy"
          fetchPriority="low"
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '32px 36px',
        }}>
          {s.label && <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', margin: '0 0 8px' }}>{s.label}</p>}
          {s.title && <h2 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 600, color: '#fff', margin: s.link_label ? '0 0 16px' : 0, lineHeight: 1.15 }}>{s.title}</h2>}
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
  }

  function slideWrapper(s, isActive = false) {
    return s.href
      ? <a href={s.href} tabIndex={isActive ? undefined : -1} aria-hidden={!isActive} style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>{renderSlideContent(s, isActive)}</a>
      : renderSlideContent(s, isActive)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 490,
        maxHeight: '85vh',
        aspectRatio: '19/9',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'pan-y',
        background: '#1a1a18',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Track — moves left as step increases. Slides inside live at
          their absolute visualPos*100% offsets. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(calc(${-step * 100}% + ${drag}px), 0, 0)`,
          transition: dragging ? 'none' : 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      >
        {offsets.map(offset => {
          const visualPos = step + offset
          const slideIdx = ((visualPos % total) + total) % total
          const s = slides[slideIdx]
          return (
            <div
              key={visualPos}
              aria-hidden={offset !== 0}
              style={{
                position: 'absolute',
                top: 0,
                left: `${visualPos * 100}%`,
                width: '100%',
                height: '100%',
              }}
            >
              {slideWrapper(s, offset === 0)}
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous"
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 2,
            }}>‹</button>
          <button onClick={() => go(1)} aria-label="Next"
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', border: 'none',
              fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 2,
            }}>›</button>
        </>
      )}

      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 2 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goToIdx(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: 44, height: 44, borderRadius: 22,
                background: 'transparent',
                border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <span
                aria-hidden="true"
                style={{
                  width: i === realIdx ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === realIdx ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 300ms ease',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
