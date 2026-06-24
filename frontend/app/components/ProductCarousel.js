'use client'
import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { localeFromPathname, localizeProduct, pathForLocale, UK_LOCALE } from '../lib/i18n'
import { currencyForLocale, priceForLocale, formatPrice } from '../lib/money'
import { useUahRate } from '../lib/useUahRate'

export default function ProductCarousel({ products }) {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const uahRate = useUahRate(locale === UK_LOCALE)
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
          zIndex: 2, width: 38, height: 38, borderRadius: 0,
          border: '1px solid #0a0a0a', background: '#fff',
          boxShadow: 'none',
          cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      <button
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        style={{
          position: 'absolute', right: -18, top: '40%', transform: 'translateY(-50%)',
          zIndex: 2, width: 38, height: 38, borderRadius: 0,
          border: '1px solid #0a0a0a', background: '#fff',
          boxShadow: 'none',
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
        {products.map((rawProduct) => {
          const p = localizeProduct(rawProduct, locale)
          const img = (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url || ''
          const price = formatPrice(priceForLocale(p, locale, uahRate), currencyForLocale(locale))
          const slug = p.slug || p.id
          return (
            <a
              key={p.id}
              href={pathForLocale(`/products/${slug}`, locale)}
              className="carousel-card"
              style={{
                flex: '0 0 200px', scrollSnapAlign: 'start',
                textDecoration: 'none', color: 'inherit',
                borderRadius: 0, overflow: 'hidden',
                border: 'none', background: '#fff',
              }}
            >
              <div style={{ position:'relative', aspectRatio: '4/5', background: '#fff', overflow: 'hidden' }}>
                {img && (
                  <Image
                    src={img}
                    alt={p.name}
                    fill
                    sizes="200px"
                    loading="lazy"
                    style={{ objectFit: 'cover', transition: 'transform 400ms ease' }}
                  />
                )}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <p style={{ fontSize: 12, fontWeight: 900, margin: '0 0 3px', lineHeight: 1.3, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing:'0.04em', textTransform:'uppercase' }}>{p.name}</p>
                <p style={{ fontSize: 12, color: '#555', margin: 0, fontWeight:800 }}>{price}</p>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
