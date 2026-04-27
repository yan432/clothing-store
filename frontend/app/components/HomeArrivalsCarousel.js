'use client'
import { useEffect, useRef, useState } from 'react'

export default function HomeArrivalsCarousel({ products }) {
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
    el.scrollBy({ left: dir * (itemWidth + 20), behavior: 'smooth' })
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    return () => el.removeEventListener('scroll', updateArrows)
  }, [])

  const fmt = (price) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(price || 0))

  return (
    <div style={{ position: 'relative' }}>
      {/* Arrow prev */}
      <button
        onClick={() => scrollBy(-1)}
        aria-label="Previous"
        style={{
          position: 'absolute', left: -20, top: '35%', transform: 'translateY(-50%)',
          zIndex: 2, width: 40, height: 40, borderRadius: '50%',
          background: '#fff', border: '1px solid #e5e5e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, opacity: canPrev ? 1 : 0, pointerEvents: canPrev ? 'auto' : 'none',
          transition: 'opacity 200ms',
        }}>‹</button>

      {/* Track */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: 20,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
          touchAction: 'pan-x',
        }}
      >
        {products.map(p => {
          const img = (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url || ''
          return (
            <a
              key={p.id}
              href={`/products/${p.slug || p.id}`}
              style={{
                flex: '0 0 calc(33.333% - 14px)',
                scrollSnapAlign: 'start',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              <div style={{ aspectRatio: '4/5', background: '#f5f5f3', borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                {img && <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
              <p style={{ fontSize: 11, color: '#9a9a92', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>{p.category || 'Essentials'}</p>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 5px', lineHeight: 1.3 }}>{p.name}</h3>
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{fmt(p.price)}</p>
            </a>
          )
        })}
      </div>

      {/* Arrow next */}
      <button
        onClick={() => scrollBy(1)}
        aria-label="Next"
        style={{
          position: 'absolute', right: -20, top: '35%', transform: 'translateY(-50%)',
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
