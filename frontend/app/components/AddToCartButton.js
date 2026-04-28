'use client'
import { useCart } from '../context/CartContext'
import { useEffect, useMemo, useState } from 'react'
import { parseSizeOptionsFromTags } from '../lib/sizeOptions'

// sizeStock: { S: 5, M: 0, L: 1 } — undefined key means no tracking (available)
export default function AddToCartButton({ product, showSizeSelector = false, sizeStock = {} }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const [maxReached, setMaxReached] = useState(false)
  const [selectedSize, setSelectedSize] = useState('')
  const sizeOptions = useMemo(() => parseSizeOptionsFromTags(product?.tags), [product?.tags])
  const shouldShowSizeSelector = showSizeSelector && sizeOptions.length > 0
  const mustSelectSize = shouldShowSizeSelector && sizeOptions.length > 1
  const availableStock = product.available_stock ?? product.stock ?? 0
  const isInStock = availableStock > 0

  // Per-size stock helpers
  const getSizeStock = (size) => sizeStock[size]  // undefined = not tracked
  const isSizeSoldOut = (size) => {
    const s = getSizeStock(size)
    return s !== undefined && s === 0
  }

  const effectiveInStock = selectedSize
    ? isInStock && !isSizeSoldOut(selectedSize)
    : isInStock

  const canAdd = effectiveInStock && (!mustSelectSize || Boolean(selectedSize))

  useEffect(() => {
    if (sizeOptions.length === 1) {
      setSelectedSize(sizeOptions[0])
      return
    }
    if (!sizeOptions.includes(selectedSize)) {
      setSelectedSize('')
    }
  }, [sizeOptions, selectedSize])

  function handleAdd() {
    if (!canAdd) return
    const result = addToCart({ ...product, size: selectedSize || sizeOptions[0] || null })
    if (!result?.ok) {
      setMaxReached(true)
      setTimeout(() => setMaxReached(false), 1800)
      return
    }
    setMaxReached(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>

      {/* ── Size selector ── */}
      {shouldShowSizeSelector && (
        <div>
          <p style={{ fontSize: 12, color: '#666660', margin: '0 0 8px' }}>Size</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sizeOptions.map((size) => {
              const stock = getSizeStock(size)
              const soldOut = isSizeSoldOut(size)
              const isLast = stock === 1
              const isAlmostGone = stock === 2
              const isSelected = selectedSize === size

              return (
                <button
                  key={size}
                  onClick={() => !soldOut && setSelectedSize(size)}
                  disabled={soldOut}
                  style={{
                    position: 'relative',
                    padding: '9px 18px',
                    border: isSelected ? '2px solid #111' : '1.5px solid #deded8',
                    borderRadius: 8,
                    background: isSelected ? '#111' : soldOut ? '#f9f9f7' : '#fff',
                    color: isSelected ? '#fff' : soldOut ? '#bbb' : '#111',
                    fontSize: 14,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: soldOut ? 'not-allowed' : 'pointer',
                    opacity: soldOut ? 0.55 : 1,
                    textDecoration: soldOut ? 'line-through' : 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                    minWidth: 48,
                    textAlign: 'center',
                  }}
                >
                  {size}
                  {/* FOMO badge */}
                  {(isLast || isAlmostGone) && !soldOut && (
                    <span style={{
                      position: 'absolute',
                      top: -7,
                      right: -5,
                      background: isLast ? '#ef4444' : '#f59e0b',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                      lineHeight: '14px',
                      whiteSpace: 'nowrap',
                    }}>
                      {isLast ? 'LAST 1' : '2 LEFT'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Add to cart ── */}
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
          ? (maxReached
            ? 'Max available quantity reached'
            : added
              ? 'Added to cart!'
              : mustSelectSize && !selectedSize
                ? 'Select size first'
                : 'Add to Cart')
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
        transition: 'border-color 0.2s',
      }}>
        View Cart
      </a>
    </div>
  )
}
