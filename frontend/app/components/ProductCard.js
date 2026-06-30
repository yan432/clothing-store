'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import WishlistButton from './WishlistButton'
import { useCart } from '../context/CartContext'
import { getMessages, localeFromPathname, localizeProduct, pathForLocale, translateCategory, UK_LOCALE } from '../lib/i18n'
import { currencyForLocale, priceForLocale, comparePriceForLocale, formatPrice } from '../lib/money'
import { parseSizeOptionsFromTags, SIZE_PRESET_OPTIONS } from '../lib/sizeOptions'
import { useUahRate } from '../lib/useUahRate'

function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_PRESET_OPTIONS.indexOf(a)
    const ib = SIZE_PRESET_OPTIONS.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

export default function ProductCard({ product, colorSiblings = [], imagePriority = false, locale, uahRate = null, quickAdd = false }) {
  const pathname = usePathname() || '/'
  const activeLocale = locale || localeFromPathname(pathname)
  // Use the server-passed rate when available (SSR-accurate); otherwise pull
  // the shared client rate. Only fetches for the Ukrainian locale.
  const hookRate = useUahRate(activeLocale === UK_LOCALE && uahRate == null)
  const effectiveRate = uahRate ?? hookRate
  const d = getMessages(activeLocale)
  const displayProduct = localizeProduct(product, activeLocale)
  const { addToCart } = useCart()
  const [hovered, setHovered] = useState(false)
  const [secondaryReadyFor, setSecondaryReadyFor] = useState(null)
  const [swatchVariant, setSwatchVariant] = useState(null) // hovered color variant
  const [quickAddState, setQuickAddState] = useState({ status: '', size: '' })
  const touchTimerRef = useRef(null)
  const leaveTimerRef = useRef(null)
  const quickAddTimerRef = useRef(null)

  // When a swatch is hovered, show that variant's photo
  const activeProduct = swatchVariant || displayProduct
  const activeSlug = swatchVariant ? (swatchVariant.slug || swatchVariant.id) : (displayProduct.slug || displayProduct.id)

  const currency = currencyForLocale(activeLocale)
  const price = priceForLocale(displayProduct, activeLocale, effectiveRate)
  const images = Array.isArray(activeProduct.image_urls) && activeProduct.image_urls.length > 0
    ? activeProduct.image_urls
    : (activeProduct.image_url ? [activeProduct.image_url] : [])
  const primaryImage = images[0]
  // Admin-picked hover photo takes precedence; fall back to the second image.
  // Guard against the admin accidentally picking the cover as the hover.
  const adminHover = activeProduct.hover_image_url && activeProduct.hover_image_url !== primaryImage
    ? activeProduct.hover_image_url
    : null
  const secondaryImage = adminHover || images[1]
  const secondaryReady = secondaryReadyFor === secondaryImage

  const priceLabel = formatPrice(price, currency)
  const comparePriceValue = comparePriceForLocale(displayProduct, activeLocale, effectiveRate)
  const comparePriceLabel = comparePriceValue ? formatPrice(comparePriceValue, currency) : null

  const availableStock = displayProduct.available_stock ?? displayProduct.stock ?? 0
  const description = (displayProduct.description || '').trim()
  const isLowStock = availableStock > 0 && availableStock <= 5
  const sizeStock = displayProduct.size_stock || product.size_stock || {}
  const sizeOptions = useMemo(() => sortSizes(parseSizeOptionsFromTags(product.tags)), [product.tags])
  const hasMultipleSizes = sizeOptions.length > 1
  const isSizeAvailable = (size) => sizeStock[size] === undefined ? availableStock > 0 : Number(sizeStock[size]) > 0
  const allSizesUnavailable = sizeOptions.length > 0 && sizeOptions.every(size => !isSizeAvailable(size))
  const isOutOfStock = availableStock <= 0 || allSizesUnavailable

  const tags = Array.isArray(displayProduct.tags) ? displayProduct.tags : []
  const discount = Number.isFinite(Number(displayProduct.discount_percent))
    ? Number(displayProduct.discount_percent)
    : (displayProduct.compare_price && displayProduct.compare_price > displayProduct.price
      ? Math.round((1 - displayProduct.price / displayProduct.compare_price) * 100)
      : null)
  const badgeTags = new Set(tags)
  if (isLowStock) badgeTags.add('low_stock')

  const BADGE = {
    new:       { label: d.products.badges.new, bg: '#0a0a0a', color: '#fff' },
    sale:      { label: `-${discount}%`, bg: '#f02a2a', color: '#fff' },
    low_stock: { label: d.products.badges.lowStock, bg: '#d7ff2f', color: '#0a0a0a' },
    sold_out:  { label: d.products.badges.soldOut, bg: '#4b4b4b', color: '#fff' },
  }

  const visibleTags = ['sold_out', 'sale', 'low_stock', 'new']
    .filter(t => badgeTags.has(t) || (t === 'sale' && discount))
    .slice(0, 2)

  useEffect(() => () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    if (quickAddTimerRef.current) clearTimeout(quickAddTimerRef.current)
  }, [])

  function setTemporaryQuickAddState(nextState, timeout = 1600) {
    if (quickAddTimerRef.current) clearTimeout(quickAddTimerRef.current)
    setQuickAddState(nextState)
    quickAddTimerRef.current = setTimeout(() => setQuickAddState({ status: '', size: '' }), timeout)
  }

  function handleQuickAdd(size = null) {
    if (isOutOfStock) {
      setTemporaryQuickAddState({ status: 'error', size: '' })
      return
    }

    const resolvedSize = size || sizeOptions[0] || null
    const sizeSpecificStock = resolvedSize ? sizeStock[resolvedSize] : undefined
    if (resolvedSize && sizeSpecificStock === 0) {
      setTemporaryQuickAddState({ status: 'error', size: resolvedSize })
      return
    }

    const stockOverride = sizeSpecificStock !== undefined
      ? { available_stock: sizeSpecificStock }
      : {}
    const result = addToCart({ ...displayProduct, size: resolvedSize, ...stockOverride })
    if (!result?.ok) {
      setTemporaryQuickAddState({
        status: result?.reason === 'max_reached' ? 'max' : 'error',
        size: resolvedSize || '',
      }, 1800)
      return
    }
    setTemporaryQuickAddState({ status: 'added', size: resolvedSize || '' }, 1500)
  }

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
      style={{display:'flex',flexDirection:'column',gap:10}}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}>
      <a href={pathForLocale('/products/' + activeSlug, activeLocale)}
        className="product-card"
        style={{textDecoration:'none',color:'inherit',display:'block'}}>

        <div className="product-card-img-wrap" style={{position:'relative',aspectRatio:'4/5',background:'#fff',border:'none',borderRadius:0,overflow:'hidden',marginBottom:12}}>

          {/* Wishlist heart button */}
          <div style={{position:'absolute',top:10,right:10,zIndex:4}}>
            <WishlistButton productId={displayProduct.id} product={displayProduct} />
          </div>

          {/* Все бейджи вместе */}
<div style={{position:'absolute',top:8,left:8,zIndex:3,display:'flex',flexDirection:'column',gap:4}}>
  {visibleTags.map(tag => (
    <span key={tag} style={{
      background: BADGE[tag].bg,
      color: BADGE[tag].color,
      fontSize:10,fontWeight:800,
      padding:'5px 8px',borderRadius:0,
      letterSpacing:'0.08em',textTransform:'uppercase',
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
              <Image
                src={primaryImage}
                alt={displayProduct.name}
                fill
                sizes="(max-width: 679px) 50vw, (max-width: 1023px) 33vw, 25vw"
                loading={imagePriority ? 'eager' : 'lazy'}
                fetchPriority={imagePriority ? 'high' : 'auto'}
                className="product-img"
                style={{
                  position:'absolute',inset:0,
                  objectFit:'cover',
                  opacity: hovered && secondaryImage && secondaryReady ? 0 : 1,
                  transition:'opacity 560ms cubic-bezier(0.22, 1, 0.36, 1)',
                  willChange:'opacity',backfaceVisibility:'hidden',zIndex:2,
                }}
              />
              {secondaryImage && (hovered || secondaryReady) && (
                <Image
                  src={secondaryImage}
                  alt=""
                  fill
                  sizes="(max-width: 679px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  loading="lazy"
                  className="product-img"
                  onLoad={() => setSecondaryReadyFor(secondaryImage)}
                  style={{position:'absolute',inset:0,objectFit:'cover',opacity: hovered && secondaryReady ? 1 : 0,backfaceVisibility:'hidden',zIndex:1}}
                />
              )}
            </div>
          ) : (
            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#888',letterSpacing:'0.08em',textTransform:'uppercase'}}>{d.products.noImage}</div>
          )}
        </div>

        <div className="product-card-info">
          <p style={{fontSize:10,color:'#666',letterSpacing:'0.12em',textTransform:'uppercase',margin:'0 0 7px',fontWeight:700}}>
            {displayProduct.category ? translateCategory(displayProduct.category, activeLocale) : d.products.essentials}
          </p>
          <p style={{fontSize:15,fontWeight:800,margin:'0 0 6px',lineHeight:1.25,letterSpacing:'0.02em',textTransform:'uppercase'}}>
            {displayProduct.name}
          </p>

          {/* Цена с зачёркнутой если есть скидка */}
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'0 0 6px'}}>
            <p style={{fontSize:14,fontWeight:800,margin:0,color: discount ? '#f02a2a' : 'inherit'}}>
              {priceLabel}
            </p>
            {comparePriceLabel && (
              <p style={{fontSize:13,fontWeight:500,margin:0,color:'#888',textDecoration:'line-through'}}>
                {comparePriceLabel}
              </p>
            )}
          </div>

          <p className="product-card-desc" style={{
            fontSize:12,color:'#777',lineHeight:1.45,margin:0,
            display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',
          }}>
            {description || d.products.fallbackDescription}
          </p>
        </div>
      </a>

      {/* Color swatches — only when there are siblings */}
      {colorSiblings.length > 0 && displayProduct.color_name && (
        <div className="product-color-swatches" style={{display:'flex',gap:6,flexWrap:'wrap',paddingTop:2}}>
          {/* Current product swatch (always active) */}
          <div
            title={displayProduct.color_name}
            style={{
              width:20,height:20,borderRadius:0,
              background: displayProduct.color_hex || '#ccc',
              border:'2px solid #111',
              boxShadow:'0 0 0 2px #fff inset',
              cursor:'default',flexShrink:0,
            }}
          />
          {colorSiblings.map(v => (
            <a
              key={v.id}
              href={pathForLocale('/products/' + (v.slug || v.id), activeLocale)}
              title={v.color_name}
              onMouseEnter={() => setSwatchVariant(v)}
              onMouseLeave={() => setSwatchVariant(null)}
              style={{
                width:20,height:20,borderRadius:0,
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

      {quickAdd && (
        <div className="product-card-quick-add" aria-live="polite">
          {hasMultipleSizes ? (
            <div className="product-card-quick-sizes" aria-label={d.cart.selectSize}>
              {sizeOptions.map(size => {
                const available = isSizeAvailable(size)
                const active = quickAddState.status === 'added' && quickAddState.size === size
                const longLabel = size.length > 4
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => available && handleQuickAdd(size)}
                    disabled={!available || isOutOfStock}
                    title={available ? `${d.cart.addToCart} - ${size}` : `${size} - ${d.cart.soldOut}`}
                    className="product-card-quick-size"
                    style={{ fontSize: longLabel ? 9 : 11, background: active ? '#d7ff2f' : undefined, color: active ? '#0a0a0a' : undefined }}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleQuickAdd(sizeOptions[0] || null)}
              disabled={isOutOfStock}
              className="product-card-quick-button"
            >
              {quickAddState.status === 'added'
                ? d.cart.added
                : isOutOfStock ? d.cart.outOfStock : d.cart.addToCart}
            </button>
          )}

          <p className={`product-card-quick-status ${quickAddState.status ? 'is-visible' : ''}`}>
            {quickAddState.status === 'added'
              ? `${d.cart.added}${quickAddState.size ? ` · ${quickAddState.size}` : ''}`
              : quickAddState.status === 'max'
                ? d.cart.maxReachedShort
                : quickAddState.status === 'error'
                  ? d.cart.outOfStock
                  : '\u00a0'}
          </p>
        </div>
      )}
    </article>
  )
}
