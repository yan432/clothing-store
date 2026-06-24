'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { getMessages } from '../lib/i18n'

export default function ProductGallery({ product, locale = 'en' }) {
  const d = getMessages(locale)
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
  const suppressTapRef = useRef(false)
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
    suppressTapRef.current = false
    setIsDragging(true)
    setDragOffset(0)
  }

  function onTouchMove(event) {
    if (touchStartXRef.current == null) return
    const currentX = event.touches[0]?.clientX ?? touchStartXRef.current
    const diff = currentX - touchStartXRef.current
    if (Math.abs(diff) > 8) suppressTapRef.current = true
    setDragOffset(diff)
  }

  function onTouchEnd(event) {
    if (touchStartXRef.current == null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current
    const diff = endX - touchStartXRef.current
    touchStartXRef.current = null
    setIsDragging(false)
    suppressTapRef.current = Math.abs(diff) > 8
    if (Math.abs(diff) >= 40) {
      if (diff > 0) goPrev()
      else goNext()
    }
    setDragOffset(0)
  }

  function onGalleryClick(event) {
    if (images.length <= 1) return
    if (suppressTapRef.current) {
      suppressTapRef.current = false
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const sideZoneWidth = rect.width * 0.42
    if (x <= sideZoneWidth) goPrev()
    else if (x >= rect.width - sideZoneWidth) goNext()
  }

  function onArrowClick(event, direction) {
    event.stopPropagation()
    suppressTapRef.current = false
    if (direction === 'prev') goPrev()
    else goNext()
  }

  return (
    <div className="product-gallery">
      {images.length > 1 && (
        <div className="product-gallery-thumbs">
          {images.map((src, index) => (
            <button
              key={src + index}
              onClick={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              aria-label={`${d.products.showImage || 'Show image'} ${index + 1}`}
              style={{
                border:'none',
                background:'#fff',
                borderRadius:0,
                position:'relative',
                width:'100%',
                aspectRatio:'4/5',
                overflow:'hidden',
                cursor:'pointer',
                padding:0,
                flexShrink:0,
                opacity: activeIndex === index ? 1 : 0.5,
              }}>
              <Image
                src={src}
                alt={product.name + ' thumbnail ' + (index + 1)}
                fill
                sizes="80px"
                loading="lazy"
                style={{objectFit:'cover'}}
              />
            </button>
          ))}
        </div>
      )}
      <div
        className="product-gallery-main"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClick={onGalleryClick}
        style={{background:'#fff',border:'none',borderRadius:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:'#888',touchAction:'pan-y'}}>
        {hasImages ? (
          <div
            className="product-gallery-track"
            style={{
              transform: `translate3d(calc(${-activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging || instantSwitch ? 'none' : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
            {images.map((src, index) => (
              <div
                key={src + index}
                style={{position:'relative',width:'100%',height:'100%',flex:'0 0 100%'}}
              >
                <Image
                  className="product-gallery-main-image"
                  src={src}
                  alt={product.name + ' image ' + (index + 1)}
                  fill
                  sizes="(max-width: 760px) 100vw, 58vw"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  draggable={false}
                  style={{objectFit:'cover'}}
                />
              </div>
            ))}
          </div>
        ) : (
          d.products.noImage
        )}

        {images.length > 1 && (
          <>
            <button type="button" className="product-gallery-arrow left" onClick={(event) => onArrowClick(event, 'prev')} aria-label={d.products.previousImage || 'Previous image'}>‹</button>
            <button type="button" className="product-gallery-arrow right" onClick={(event) => onArrowClick(event, 'next')} aria-label={d.products.nextImage || 'Next image'}>›</button>
            <div className="product-gallery-counter">{activeIndex + 1} / {images.length}</div>
          </>
        )}
      </div>

    </div>
  )
}
