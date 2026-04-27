'use client'
import { useEffect, useRef, useState } from 'react'

export default function HomeCategoriesCarousel({ tiles }) {
  const trackRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  function updateArrows() {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 8)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  function scrollBy(dir) {
    const el = trackRef.current
    if (!el) return
    const itemWidth = el.firstElementChild?.offsetWidth || 0
    el.scrollBy({ left: dir * (itemWidth + 16), behavior: 'smooth' })
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    return () => el.removeEventListener('scroll', updateArrows)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => scrollBy(-1)}
        aria-label="Previous"
        style={{
          position: 'absolute', left: -20, top: '40%', transform: 'translateY(-50%)',
          zIndex: 2, width: 40, height: 40, borderRadius: '50%',
          background: '#fff', border: '1px solid #e5e5e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, opacity: canPrev ? 1 : 0, pointerEvents: canPrev ? 'auto' : 'none',
          transition: 'opacity 200ms',
        }}>‹</button>

      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
          touchAction: 'pan-x',
        }}
      >
        {tiles.map(tile => (
          <a
            key={tile.title}
            href={tile.href}
            style={{
              flex: '0 0 calc(33.333% - 11px)',
              scrollSnapAlign: 'start',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid #ececea',
              background: '#f5f5f3',
            }}
          >
            <div
              style={{
                aspectRatio: '4/5',
                backgroundImage: `url(${tile.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              aria-label={tile.title}
            />
            <div style={{ background: '#fff', padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{tile.title}</p>
            </div>
          </a>
        ))}
      </div>

      <button
        onClick={() => scrollBy(1)}
        aria-label="Next"
        style={{
          position: 'absolute', right: -20, top: '40%', transform: 'translateY(-50%)',
          zIndex: 2, width: 40, height: 40, borderRadius: '50%',
          background: '#fff', border: '1px solid #e5e5e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, opacity: canNext ? 1 : 0, pointerEvents: canNext ? 'auto' : 'none',
          transition: 'opacity 200ms',
        }}>›</button>
    </div>
  )
}
