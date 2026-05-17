'use client'
import { useRef, useState, useEffect } from 'react'

export default function ChapterSlider({ slides }) {
  const trackRef = useRef(null)
  const [current, setCurrent] = useState(0)

  function goTo(idx) {
    const track = trackRef.current
    if (!track) return
    const item = track.children[idx]
    if (!item) return
    track.scrollTo({ left: item.offsetLeft, behavior: 'smooth' })
    setCurrent(idx)
  }

  // Sync dot indicator with scroll (touch swipe)
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    function onScroll() {
      const idx = Math.round(track.scrollLeft / track.offsetWidth)
      setCurrent(idx)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  const total = slides.length

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* Track */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          borderRadius: 4,
          background: '#f5f5f3',
        }}
      >
        {slides.map((img, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: '100%',
              scrollSnapAlign: 'start',
              aspectRatio: '1/1',
              overflow: 'hidden',
            }}
          >
            <img
              src={img.src}
              alt={img.caption || ''}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ))}
      </div>

      {/* Prev / Next arrows */}
      {total > 1 && (
        <>
          <button
            onClick={() => goTo(Math.max(0, current - 1))}
            disabled={current === 0}
            style={{
              position: 'absolute', top: '50%', left: 10,
              transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)', border: 'none',
              cursor: current === 0 ? 'default' : 'pointer',
              opacity: current === 0 ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
              transition: 'opacity 0.2s',
            }}
          >‹</button>
          <button
            onClick={() => goTo(Math.min(total - 1, current + 1))}
            disabled={current === total - 1}
            style={{
              position: 'absolute', top: '50%', right: 10,
              transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)', border: 'none',
              cursor: current === total - 1 ? 'default' : 'pointer',
              opacity: current === total - 1 ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
              transition: 'opacity 0.2s',
            }}
          >›</button>
        </>
      )}

      {/* Dots + caption */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        {total > 1 && (
          <div style={{ display: 'flex', gap: 5 }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: 5, height: 5, borderRadius: '50%', padding: 0, border: 'none',
                  background: i === current ? '#1a1a18' : '#ccc',
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        )}
        {slides[current]?.caption && (
          <div style={{ fontSize: 10, letterSpacing: '0.06em', color: '#9a9a92', fontStyle: 'italic' }}>
            {slides[current].caption}
          </div>
        )}
      </div>
    </div>
  )
}
