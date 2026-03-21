'use client'
import { useRef, useState } from 'react'

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false)
  const touchTimerRef = useRef(null)
  const leaveTimerRef = useRef(null)
  const price = Number(product.price || 0)
  const images = Array.isArray(product.image_urls) && product.image_urls.length > 0
    ? product.image_urls
    : (product.image_url ? [product.image_url] : [])
  const primaryImage = images[0]
  const secondaryImage = images[1]
  const priceLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
  const availableStock = product.available_stock ?? product.stock ?? 0
  const isInStock = availableStock > 0
  const stockLabel = isInStock ? `In stock: ${availableStock}` : 'Out of stock'
  const description = (product.description || '').trim()

  function handleMouseEnter() {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setHovered(true)
  }

  function handleMouseLeave() {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    // Small linger makes the transition finish smoothly.
    leaveTimerRef.current = setTimeout(() => setHovered(false), 180)
  }

  function handleTouchStart() {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setHovered(true)
  }

  function handleTouchMove() {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    setHovered(true)
  }

  function handleTouchEnd() {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    touchTimerRef.current = setTimeout(() => setHovered(false), 360)
  }

  return (
    <article
      style={{display:'flex',flexDirection:'column',gap:12}}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}>
      <a href={'/products/' + product.id}
        className="product-card"
        style={{textDecoration:'none',color:'inherit',display:'block'}}>
        <div style={{position:'relative',aspectRatio:'3/4',background:'#f5f5f3',borderRadius:16,overflow:'hidden',marginBottom:14}}>
          <div style={{
            position:'absolute',
            top:10,
            left:10,
            zIndex:1,
            fontSize:11,
            fontWeight:500,
            borderRadius:999,
            padding:'6px 10px',
            background:isInStock ? 'rgba(255,255,255,0.92)' : 'rgba(26,26,24,0.85)',
            color:isInStock ? '#1a1a18' : '#fff',
            border:isInStock ? '1px solid #e5e5e0' : '1px solid transparent',
          }}>
            {stockLabel}
          </div>
          {primaryImage ? (
            <>
              <img
                src={primaryImage}
                alt={product.name}
                className="product-img"
                style={{
                  position:'absolute',
                  inset:0,
                  opacity:hovered && secondaryImage ? 0 : 1,
                  transition:'opacity 560ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                  willChange:'opacity',
                  backfaceVisibility:'hidden',
                  transform:hovered ? 'translateZ(0) scale(1.03)' : 'translateZ(0) scale(1)',
                }}
              />
              {secondaryImage && (
                <img
                  src={secondaryImage}
                  alt={product.name}
                  className="product-img"
                  style={{
                    position:'absolute',
                    inset:0,
                    opacity:hovered ? 1 : 0,
                    transition:'opacity 560ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                    willChange:'opacity',
                    backfaceVisibility:'hidden',
                    transform:hovered ? 'translateZ(0) scale(1.03)' : 'translateZ(0) scale(1)',
                  }}
                />
              )}
            </>
          ) : (
            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#ccc'}}>No image</div>
          )}
        </div>
        <p style={{fontSize:11,color:'#8f8f87',letterSpacing:'0.1em',textTransform:'uppercase',margin:'0 0 8px'}}>
          {product.category || 'Essentials'}
        </p>
        <h2 style={{fontSize:16,fontWeight:600,margin:'0 0 6px',lineHeight:1.35}}>
          {product.name}
        </h2>
        <p style={{fontSize:16,fontWeight:600,margin:'0 0 8px'}}>
          {priceLabel}
        </p>
        <p style={{
          fontSize:13,
          color:'#6d6d66',
          lineHeight:1.5,
          margin:0,
          minHeight:40,
          display:'-webkit-box',
          WebkitLineClamp:2,
          WebkitBoxOrient:'vertical',
          overflow:'hidden',
        }}>
          {description || 'Minimal everyday essential. Tap to view full details.'}
        </p>
      </a>
    </article>
  )
}