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
    <div style={{ position: 'relative' }}>
      <button onClick={() => scrollBy(-1)} aria-label="Previous" style={{
        position: 'absolute', left: -16, top: '35%', transform: 'translateY(-50%)',
        zIndex: 2, width: 36, height: 36, borderRadius: '50%',
        background: '#fff', border: '1px solid #e5e5e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, opacity: canPrev ? 1 : 0, pointerEvents: canPrev ? 'auto' : 'none',
        transition: 'opacity 200ms',
      }}>‹</button>

      <div ref={trackRef} style={{
        display: 'flex', gap: 12,
        overflowX: 'auto', scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        paddingBottom: 4, touchAction: 'pan-x',
      }}>
        {products.map(p => (
          <div key={p.id} style={{ flex: '0 0 calc(50% - 6px)', scrollSnapAlign: 'start', minWidth: 0 }}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      <button onClick={() => scrollBy(1)} aria-label="Next" style={{
        position: 'absolute', right: -16, top: '35%', transform: 'translateY(-50%)',
        zIndex: 2, width: 36, height: 36, borderRadius: '50%',
        background: '#fff', border: '1px solid #e5e5e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, opacity: canNext ? 1 : 0, pointerEvents: canNext ? 'auto' : 'none',
        transition: 'opacity 200ms',
      }}>›</button>
    </div>
  )
}
