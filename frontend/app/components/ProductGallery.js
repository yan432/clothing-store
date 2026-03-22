'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function ProductGallery({ product }) {
  const images = useMemo(() => {
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      return product.image_urls
    }
    return product.image_url ? [product.image_url] : []
  }, [product.image_url, product.image_urls])
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [instantSwitch, setInstantSwitch] = useState(false)
  const touchStartXRef = useRef(null)
  const activeImage = images[activeIndex] || ''
  const hasImages = images.length > 0

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const apply = () => setInstantSwitch(media.matches)
    apply()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    media.addListener(apply)
    return () => media.removeListener(apply)
  }, [])

  function goPrev() {
    if (!hasImages) return
    setActiveIndex((idx) => (idx - 1 + images.length) % images.length)
  }

  function goNext() {
    if (!hasImages) return
    setActiveIndex((idx) => (idx + 1) % images.length)
  }

  function onTouchStart(event) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
    setIsDragging(true)
    setDragOffset(0)
  }

  function onTouchMove(event) {
    if (touchStartXRef.current == null) return
    const currentX = event.touches[0]?.clientX ?? touchStartXRef.current
    setDragOffset(currentX - touchStartXRef.current)
  }

  function onTouchEnd(event) {
    if (touchStartXRef.current == null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current
    const diff = endX - touchStartXRef.current
    touchStartXRef.current = null
    setIsDragging(false)
    if (Math.abs(diff) >= 40) {
      if (diff > 0) goPrev()
      else goNext()
    }
    setDragOffset(0)
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery-thumbs">
        {images.map((src, index) => (
          <button
            key={src + index}
            onClick={() => setActiveIndex(index)}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            aria-label={`Show image ${index + 1}`}
            style={{
              border:'1px solid ' + (activeIndex === index ? '#111' : '#e5e5e0'),
              background:'#fff',
              borderRadius:10,
              width:'100%',
              aspectRatio:'3 / 4',
              overflow:'hidden',
              cursor:'pointer',
              padding:0,
            }}>
            <img src={src} alt={product.name + ' thumbnail ' + (index + 1)} style={{width:'100%',height:'100%',objectFit:'cover'}} />
          </button>
        ))}
      </div>
      <div
        className="product-gallery-main"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{background:'#f5f5f3',borderRadius:20,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc'}}>
        {hasImages ? (
          <div
            className="product-gallery-track"
            style={{
              transform: `translate3d(calc(${-activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging || instantSwitch ? 'none' : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
            {images.map((src, index) => (
              <img
                key={src + index}
                className="product-gallery-main-image"
                src={src}
                alt={product.name + ' image ' + (index + 1)}
                draggable={false}
                style={{width:'100%',height:'100%',objectFit:'cover',flex:'0 0 100%'}}
              />
            ))}
          </div>
        ) : (
          'No image'
        )}

        {images.length > 1 && (
          <>
            <button className="product-gallery-arrow left" onClick={goPrev} aria-label="Previous image">‹</button>
            <button className="product-gallery-arrow right" onClick={goNext} aria-label="Next image">›</button>
            <div className="product-gallery-counter">{activeIndex + 1} / {images.length}</div>
          </>
        )}
      </div>
    </div>
  )
}
