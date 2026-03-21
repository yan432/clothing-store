'use client'
import { useMemo, useRef, useState } from 'react'

export default function ProductGallery({ product }) {
  const images = useMemo(() => {
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      return product.image_urls
    }
    return product.image_url ? [product.image_url] : []
  }, [product.image_url, product.image_urls])
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartXRef = useRef(null)
  const activeImage = images[activeIndex] || ''
  const hasImages = images.length > 0

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
  }

  function onTouchEnd(event) {
    if (touchStartXRef.current == null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current
    const diff = endX - touchStartXRef.current
    touchStartXRef.current = null
    if (Math.abs(diff) < 40) return
    if (diff > 0) goPrev()
    else goNext()
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery-thumbs">
        {images.map((src, index) => (
          <button
            key={src + index}
            onClick={() => setActiveIndex(index)}
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
        onTouchEnd={onTouchEnd}
        style={{background:'#f5f5f3',borderRadius:20,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc'}}>
        {activeImage ? <img src={activeImage} alt={product.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : 'No image'}

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
