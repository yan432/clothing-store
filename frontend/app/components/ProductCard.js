'use client'
import { useEffect, useRef, useState } from 'react'

export default function ProductCard({ product, colorSiblings = [] }) {
  const [hovered, setHovered] = useState(false)
  const [secondaryReady, setSecondaryReady] = useState(false)
  const [swatchVariant, setSwatchVariant] = useState(null) // hovered color variant
  const touchTimerRef = useRef(null)
  const leaveTimerRef = useRef(null)

  // When a swatch is hovered, show that variant's photo
  const activeProduct = swatchVariant || product
  const activeSlug = swatchVariant ? (swatchVariant.slug || swatchVariant.id) : (product.slug || product.id)

  const price = Number(product.price || 0)
  const images = Array.isArray(activeProduct.image_urls) && activeProduct.image_urls.length > 0
    ? activeProduct.image_urls
    : (activeProduct.image_url ? [activeProduct.image_url] : [])
  const primaryImage = images[0]
  const secondaryImage = images[1]

  const priceLabel = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
  const comparePriceLabel = product.compare_price
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(product.compare_price)
    : null

  const availableStock = product.available_stock ?? product.stock ?? 0
  const description = (product.description || '').trim()
  const isLowStock = availableStock > 0 && availableStock <= 5

  const tags = Array.isArray(product.tags) ? product.tags : []
  const discount = Number.isFinite(Number(product.discount_percent))
    ? Number(product.discount_percent)
    : (product.compare_price && product.compare_price > product.price
      ? Math.round((1 - product.price / product.compare_price) * 100)
      : null)
  const badgeTags = new Set(tags)
  if (isLowStock) badgeTags.add('low_stock')

  const BADGE = {
    new:       { label: 'New',           bg: '#000',    color: '#fff' },
    sale:      { label: `-${discount}%`, bg: '#ef4444', color: '#fff' },
    low_stock: { label: 'Low stock',     bg: '#f59e0b', color: '#fff' },
    sold_out:  { label: 'Sold out',      bg: '#6b6b6b', color: '#fff' },
  }

  const visibleTags = ['sold_out', 'sale', 'low_stock', 'new']
    .filter(t => badgeTags.has(t) || (t === 'sale' && discount))
    .slice(0, 2)

  useEffect(() => {
    setSecondaryReady(false)
    if (!secondaryImage) return
    const img = new Image()
    img.src = secondaryImage
    img.onload = () => setSecondaryReady(true)
  }, [secondaryImage])

  function handleMouseEnter() {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setHovered(true)
  }

  function handleMouseLeave() {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = setTimeout(() => setHovered(false), 180)
  }

  function handleTouchStart() {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    // Delay before showing second image — prevents triggering while scrolling
    touchTimerRef.current = setTimeout(() => setHovered(true), 180)
  }

  function handleTouchMove() {
    // keep hover if already triggered; just let the timer run
  }

  function handleTouchEnd() {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    touchTimerRef.current = setTimeout(() => setHovered(false), 600)
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
      <a href={'/products/' + activeSlug}
        className="product-card"
        style={{textDecoration:'none',color:'inherit',display:'block'}}>

        <div className="product-card-img-wrap" style={{position:'relative',aspectRatio:'4/5',background:'#f5f5f3',borderRadius:16,overflow:'hidden',marginBottom:14}}>

          {/* Все бейджи вместе */}
<div style={{position:'absolute',top:10,left:10,zIndex:3,display:'flex',flexDirection:'column',gap:4}}>
  {visibleTags.map(tag => (
    <span key={tag} style={{
      background: BADGE[tag].bg,
      color: BADGE[tag].color,
      fontSize:10,fontWeight:700,
      padding:'4px 9px',borderRadius:999,
      letterSpacing:'0.06em',textTransform:'uppercase',
      display:'inline-block',width:'fit-content',
    }}>
      {BADGE[tag].label}
    </span>
  ))}
</div>


          {primaryImage ? (
            <div style={{
              position:'absolute',inset:0,
              transition:'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
              transform: hovered ? 'translateZ(0) scale(1.03)' : 'translateZ(0) scale(1)',
              willChange:'transform',backfaceVisibility:'hidden',
            }}>
              <img
                src={primaryImage}
                alt={product.name}
                className="product-img"
                style={{
                  position:'absolute',inset:0,
                  opacity: hovered && secondaryImage && secondaryReady ? 0 : 1,
                  transition:'opacity 560ms cubic-bezier(0.22, 1, 0.36, 1)',
                  willChange:'opacity',backfaceVisibility:'hidden',zIndex:2,
                }}
              />
              {secondaryImage && (
                <img
                  src={secondaryImage}
                  alt={product.name}
                  className="product-img"
                  onLoad={() => setSecondaryReady(true)}
                  style={{position:'absolute',inset:0,opacity: secondaryReady ? 1 : 0,backfaceVisibility:'hidden',zIndex:1}}
                />
              )}
            </div>
          ) : (
            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#ccc'}}>No image</div>
          )}
        </div>

        <div className="product-card-info">
          <p style={{fontSize:11,color:'#8f8f87',letterSpacing:'0.1em',textTransform:'uppercase',margin:'0 0 8px'}}>
            {product.category || 'Essentials'}
          </p>
          <h2 style={{fontSize:16,fontWeight:600,margin:'0 0 6px',lineHeight:1.35}}>
            {product.name}
          </h2>

          {/* Цена с зачёркнутой если есть скидка */}
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'0 0 8px'}}>
            <p style={{fontSize:16,fontWeight:600,margin:0,color: discount ? '#ef4444' : 'inherit'}}>
              {priceLabel}
            </p>
            {comparePriceLabel && (
              <p style={{fontSize:14,fontWeight:400,margin:0,color:'#aaa',textDecoration:'line-through'}}>
                {comparePriceLabel}
              </p>
            )}
          </div>

          <p className="product-card-desc" style={{
            fontSize:13,color:'#6d6d66',lineHeight:1.5,margin:0,
            display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',
          }}>
            {description || 'Minimal everyday essential. Tap to view full details.'}
          </p>
        </div>
      </a>

      {/* Color swatches — only when there are siblings */}
      {colorSiblings.length > 0 && product.color_name && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap',paddingTop:2}}>
          {/* Current product swatch (always active) */}
          <div
            title={product.color_name}
            style={{
              width:20,height:20,borderRadius:'50%',
              background: product.color_hex || '#ccc',
              border:'2px solid #111',
              boxShadow:'0 0 0 2px #fff inset',
              cursor:'default',flexShrink:0,
            }}
          />
          {colorSiblings.map(v => (
            <a
              key={v.id}
              href={'/products/' + (v.slug || v.id)}
              title={v.color_name}
              onMouseEnter={() => setSwatchVariant(v)}
              onMouseLeave={() => setSwatchVariant(null)}
              style={{
                width:20,height:20,borderRadius:'50%',
                background: v.color_hex || '#ccc',
                border:'2px solid transparent',
                boxShadow:'0 0 0 1.5px #ccc',
                flexShrink:0,display:'block',
                opacity: v.in_stock !== false ? 1 : 0.35,
              }}
            />
          ))}
        </div>
      )}
    </article>
  )
}