'use client'
import { useCart } from '../context/CartContext'
import { useEffect, useMemo, useState } from 'react'
import { parseSizeOptionsFromTags, SIZE_PRESET_OPTIONS } from '../lib/sizeOptions'

// sizeStock: { S: 5, M: 0, L: 1 } — undefined key = not tracked (available)
export default function AddToCartButton({ product, showSizeSelector = false, sizeStock = {} }) {
  const { addToCart } = useCart()
  const [added, setAdded]         = useState(false)
  const [maxReached, setMaxReached] = useState(false)
  const [selectedSize, setSelectedSize] = useState('')

  // Parse + sort sizes in standard preset order (XS → S → M → L → XL → XXL → One Size)
  const sizeOptions = useMemo(() => {
    const raw = parseSizeOptionsFromTags(product?.tags)
    return [...raw].sort((a, b) => {
      const ia = SIZE_PRESET_OPTIONS.indexOf(a)
      const ib = SIZE_PRESET_OPTIONS.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  }, [product?.tags])

  const shouldShowSizeSelector = showSizeSelector && sizeOptions.length > 0
  const mustSelectSize         = shouldShowSizeSelector && sizeOptions.length > 1
  const availableStock         = product.available_stock ?? product.stock ?? 0
  const isInStock              = availableStock > 0

  // Per-size helpers
  const getSizeQty   = (size) => sizeStock[size]          // undefined = not tracked
  const isSoldOut    = (size) => getSizeQty(size) === 0   // only sold out if explicitly 0

  const effectiveInStock = selectedSize
    ? isInStock && !isSoldOut(selectedSize)
    : isInStock

  const canAdd = effectiveInStock && (!mustSelectSize || Boolean(selectedSize))

  // Auto-select when only one size
  useEffect(() => {
    if (sizeOptions.length === 1) { setSelectedSize(sizeOptions[0]); return }
    if (!sizeOptions.includes(selectedSize)) setSelectedSize('')
  }, [sizeOptions, selectedSize])

  function handleAdd() {
    if (!canAdd) return
    const result = addToCart({ ...product, size: selectedSize || sizeOptions[0] || null })
    if (!result?.ok) {
      setMaxReached(true); setTimeout(() => setMaxReached(false), 1800); return
    }
    setMaxReached(false); setAdded(true); setTimeout(() => setAdded(false), 1500)
  }

  // FOMO state for currently selected size
  const selectedQty  = selectedSize ? getSizeQty(selectedSize) : undefined
  const showLastOne  = selectedQty === 1
  const showFewLeft  = selectedQty === 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>

      {/* ── Size selector ─────────────────────────────── */}
      {shouldShowSizeSelector && (
        <>
          {/* Styled select wrapper */}
          <div style={{
            position: 'relative',
            border: '1.5px solid #deded8',
            borderRadius: 10,
            background: '#fff',
          }}>
            <p style={{
              fontSize: 11, color: '#888', margin: 0,
              padding: '9px 14px 0',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Size
            </p>
            <select
              value={selectedSize}
              onChange={e => setSelectedSize(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                padding: '4px 36px 10px 14px',
                fontSize: 15,
                fontWeight: 500,
                background: 'transparent',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                color: '#1a1a18',
              }}
            >
              {mustSelectSize && (
                <option value="" disabled>Select your size</option>
              )}
              {sizeOptions.map(size => {
                const qty     = getSizeQty(size)
                const soldOut = isSoldOut(size)
                let label = size
                if (soldOut)  label = `${size}  ·  sold out`
                else if (qty === 1) label = `${size}  ·  last 1 left!`
                else if (qty === 2) label = `${size}  ·  only 2 left`
                return (
                  <option key={size} value={size} disabled={soldOut}>
                    {label}
                  </option>
                )
              })}
            </select>
            {/* Custom chevron */}
            <svg
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(30%)', pointerEvents: 'none', color: '#888' }}
              width="14" height="14" viewBox="0 0 14 14" fill="none"
            >
              <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* FOMO warning under the select */}
          {showLastOne && (
            <p style={{ margin: 0, fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>⚠</span> Only 1 unit left in size {selectedSize}!
            </p>
          )}
          {showFewLeft && (
            <p style={{ margin: 0, fontSize: 12, color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>⚠</span> Only 2 units left in size {selectedSize}
            </p>
          )}
        </>
      )}

      {/* ── Add to cart ───────────────────────────────── */}
      <button
        onClick={handleAdd}
        disabled={!canAdd}
        style={{
          background: added ? '#16a34a' : '#000',
          color: '#fff',
          border: 'none',
          padding: '16px 24px',
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          cursor: canAdd ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s, opacity 0.2s',
          width: '100%',
          opacity: canAdd ? 1 : 0.55,
        }}
      >
        {isInStock
          ? maxReached   ? 'Max available quantity reached'
          : added        ? 'Added to cart!'
          : mustSelectSize && !selectedSize ? 'Select size first'
          : 'Add to Cart'
          : 'Out of stock'}
      </button>

      <a href="/cart" style={{
        border: '1px solid #e5e5e3',
        padding: '14px 24px',
        borderRadius: 999,
        fontSize: 14,
        textAlign: 'center',
        textDecoration: 'none',
        color: 'inherit',
      }}>
        View Cart
      </a>
    </div>
  )
}
