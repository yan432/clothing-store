'use client'
import { useEffect, useRef, useState } from 'react'
import ProductCard from './ProductCard'

export default function RecommendationsCarousel({ products }) {
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
    el.scrollBy({ left: dir * (itemWidth + 12), behavior: 'smooth' })
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

      {/* Arrows — shown only on tablet+ via CSS */}
      <button onClick={() => scrollBy(-1)} aria-label="Previous" className="rec-arrow rec-arrow-left" style={{
        opacity: canPrev ? 1 : 0, pointerEvents: canPrev ? 'auto' : 'none',
      }}>‹</button>

      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        {products.map(p => (
          <div key={p.id} style={{ flex: '0 0 calc(50% - 6px)', scrollSnapAlign: 'start', minWidth: 0 }}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      <button onClick={() => scrollBy(1)} aria-label="Next" className="rec-arrow rec-arrow-right" style={{
        opacity: canNext ? 1 : 0, pointerEvents: canNext ? 'auto' : 'none',
      }}>›</button>
    </div>
  )
}
