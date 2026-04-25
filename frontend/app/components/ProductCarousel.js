'use client'
import { useRef } from 'react'

export default function ProductCarousel({ products }) {
  const trackRef = useRef(null)

  function scroll(dir) {
    if (!trackRef.current) return
    const card = trackRef.current.querySelector('.carousel-card')
    const step = card ? card.offsetWidth + 16 : 280
    trackRef.current.scrollBy({ left: dir * step * 2, behavior: 'smooth' })
  }

  if (!products || products.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      {/* Scroll buttons */}
      <button
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        style={{
          position: 'absolute', left: -18, top: '40%', transform: 'translateY(-50%)',
          zIndex: 2, width: 38, height: 38, borderRadius: '50%',
          border: '1px solid #e0e0da', background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      <button
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        style={{
          position: 'absolute', right: -18, top: '40%', transform: 'translateY(-50%)',
          zIndex: 2, width: 38, height: 38, borderRadius: '50%',
          border: '1px solid #e0e0da', background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>

      {/* Track */}
      <div
        ref={trackRef}
        style={{
          display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch', paddingBottom: 4,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
      >
        {products.map((p) => {
          const img = (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url || ''
          const price = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(p.price || 0))
          const slug = p.slug || p.id
          return (
            <a
              key={p.id}
              href={`/products/${slug}`}
              className="carousel-card"
              style={{
                flex: '0 0 200px', scrollSnapAlign: 'start',
                textDecoration: 'none', color: 'inherit',
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid #ececea', background: '#fff',
              }}
            >
              <div style={{ aspectRatio: '4/5', background: '#f5f5f3', overflow: 'hidden' }}>
                {img && (
                  <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 400ms ease', }} />
                )}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 3px', lineHeight: 1.3, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                <p style={{ fontSize: 12, color: '#777', margin: 0 }}>{price}</p>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
