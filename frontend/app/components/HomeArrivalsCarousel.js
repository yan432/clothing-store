'use client'
import { useEffect, useRef, useState } from 'react'
import ProductCard from './ProductCard'

export default function HomeArrivalsCarousel({ products, locale = 'en' }) {
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

  return (
    <div className="home-arrivals-carousel-wrap" style={{ position: 'relative' }}>
      <button
        className="home-arrivals-carousel-arrow"
        onClick={() => scrollBy(-1)}
        aria-label="Previous"
        style={{
          position: 'absolute', left: -20, top: '35%', transform: 'translateY(-50%)',
          zIndex: 2, width: 40, height: 40, borderRadius: 0,
          background: '#fff', border: '1px solid #0a0a0a',
          boxShadow: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, opacity: canPrev ? 1 : 0, pointerEvents: canPrev ? 'auto' : 'none',
          transition: 'opacity 200ms',
        }}>‹</button>

      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: 20,
          overflowX: 'auto',
          // `proximity` (vs `mandatory`) lets vertical page scrolls pass
          // through cleanly when the finger lands on the carousel — the
          // browser only snaps if the user releases close to a snap point.
          scrollSnapType: 'x proximity',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4,
          // Allow both axes so iOS Safari can route vertical pan to the
          // page without first trying to lock to the carousel's x-axis.
          touchAction: 'pan-x pan-y',
        }}
      >
        {products.map(p => (
          <div
            key={p.id}
            className="home-arrivals-carousel-item"
            style={{ scrollSnapAlign: 'start', minWidth: 0 }}
          >
            <ProductCard product={p} locale={locale} />
          </div>
        ))}
      </div>

      <button
        className="home-arrivals-carousel-arrow"
        onClick={() => scrollBy(1)}
        aria-label="Next"
        style={{
          position: 'absolute', right: -20, top: '35%', transform: 'translateY(-50%)',
          zIndex: 2, width: 40, height: 40, borderRadius: 0,
          background: '#fff', border: '1px solid #0a0a0a',
          boxShadow: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, opacity: canNext ? 1 : 0, pointerEvents: canNext ? 'auto' : 'none',
          transition: 'opacity 200ms',
        }}>›</button>
    </div>
  )
}
