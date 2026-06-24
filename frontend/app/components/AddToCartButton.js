'use client'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useMemo, useRef, useState } from 'react'
import { Bell, AlertTriangle } from 'lucide-react'
import { parseSizeOptionsFromTags, SIZE_PRESET_OPTIONS } from '../lib/sizeOptions'
import NotifyMePopup from './NotifyMePopup'
import { getMessages, pathForLocale } from '../lib/i18n'
import { trackAddToCartBlocked, trackSizeSelect } from '../lib/track'

// sizeStock: { S: 5, M: 0, L: 1 } — undefined key = not tracked (available)
export default function AddToCartButton({ product, showSizeSelector = false, sizeStock = {}, locale = 'en' }) {
  const d = getMessages(locale)
  const { addToCart } = useCart()
  const { user } = useAuth()
  const [added, setAdded]           = useState(false)
  const [maxReached, setMaxReached] = useState(false)
  const [selectedSizeInput, setSelectedSizeInput] = useState('')
  const [notifyPopup, setNotifyPopup]   = useState(false)
  const [sizePromptPulse, setSizePromptPulse] = useState(false)
  const selectRef = useRef(null)
  const productTags = product?.tags

  // Parse + sort sizes in standard preset order (XS → S → M → L → XL → XXL → One Size)
  const sizeOptions = useMemo(() => {
    const raw = parseSizeOptionsFromTags(productTags)
    return [...raw].sort((a, b) => {
      const ia = SIZE_PRESET_OPTIONS.indexOf(a)
      const ib = SIZE_PRESET_OPTIONS.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  }, [productTags])

  const shouldShowSizeSelector = showSizeSelector && sizeOptions.length > 0
  const mustSelectSize         = shouldShowSizeSelector && sizeOptions.length > 1
  const availableStock         = product.available_stock ?? product.stock ?? 0
  const isInStock              = availableStock > 0
  const selectedSize = sizeOptions.includes(selectedSizeInput)
    ? selectedSizeInput
    : sizeOptions.length === 1 ? sizeOptions[0] : ''

  // Per-size helpers
  const getSizeQty   = (size) => sizeStock[size]          // undefined = not tracked
  const isSoldOut    = (size) => getSizeQty(size) === 0   // only sold out if explicitly 0

  const effectiveInStock = selectedSize
    ? isInStock && !isSoldOut(selectedSize)
    : isInStock

  const canAdd = effectiveInStock && (!mustSelectSize || Boolean(selectedSize))

  function promptSizeSelection() {
    const el = selectRef.current
    if (el) {
      el.focus({ preventScroll: true })
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      try { el.showPicker?.() } catch {}
    }
    setSizePromptPulse(true)
    setTimeout(() => setSizePromptPulse(false), 1200)
  }

  function handleAdd() {
    if (mustSelectSize && !selectedSize) {
      trackAddToCartBlocked({
        product,
        reason: 'size_required',
      })
      promptSizeSelection()
      return
    }
    if (!canAdd) {
      trackAddToCartBlocked({
        product,
        reason: !isInStock ? 'out_of_stock' : 'unavailable_size',
        size: selectedSize,
        availableStock: selectedSize ? getSizeQty(selectedSize) : availableStock,
      })
      return
    }
    const size = selectedSize || sizeOptions[0] || null
    const sizeSpecificStock = size != null ? getSizeQty(size) : undefined
    // Override available_stock with size-specific stock so CartContext enforces per-size limits
    const stockOverride = sizeSpecificStock !== undefined
      ? { available_stock: sizeSpecificStock }
      : {}
    const result = addToCart({ ...product, size, ...stockOverride })
    if (!result?.ok) {
      trackAddToCartBlocked({
        product,
        reason: result?.reason || 'cart_add_failed',
        size,
        availableStock: sizeSpecificStock ?? availableStock,
      })
      setMaxReached(true); setTimeout(() => setMaxReached(false), 1800); return
    }
    setMaxReached(false); setAdded(true); setTimeout(() => setAdded(false), 1500)
  }

  function handleSizeChange(event) {
    const nextSize = event.target.value
    setSelectedSizeInput(nextSize)
    setSizePromptPulse(false)
    trackSizeSelect({
      product,
      size: nextSize,
      availableStock: getSizeQty(nextSize),
    })
  }

  function handleNotifyClick() {
    trackAddToCartBlocked({
      product,
      reason: 'size_sold_out',
      size: selectedSize,
      availableStock: getSizeQty(selectedSize),
    })
    setNotifyPopup(true)
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
            border: `1px solid ${sizePromptPulse ? '#111' : '#0a0a0a'}`,
            borderRadius: 0,
            background: '#fff',
            boxShadow: sizePromptPulse ? '0 0 0 3px rgba(215,255,47,0.9)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <p style={{
              fontSize: 11, color: sizePromptPulse ? '#111' : '#888', margin: 0,
              padding: '9px 14px 0',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: sizePromptPulse ? 800 : 600,
              transition: 'color 0.2s',
            }}>
              {d.cart.size}
            </p>
            <select
              ref={selectRef}
              value={selectedSize}
              onChange={handleSizeChange}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                padding: '4px 36px 10px 14px',
                fontSize: 15,
                fontWeight: 600,
                background: 'transparent',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                color: '#0a0a0a',
              }}
            >
              {mustSelectSize && (
                <option value="" disabled>{d.cart.selectSize}</option>
              )}
              {sizeOptions.map(size => {
                const qty     = getSizeQty(size)
                const soldOut = isSoldOut(size)
                let label = size
                if (soldOut)        label = `${size}  ·  ${d.cart.soldOut}`
                else if (qty === 1) label = `${size}  ·  ${d.cart.lastOne}`
                else if (qty === 2) label = `${size}  ·  ${d.cart.onlyTwo}`
                return (
                  // Not disabled — user can select sold-out sizes to trigger "Notify me"
                  <option key={size} value={size}>
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
              <AlertTriangle size={13} strokeWidth={2} /> {d.cart.onlyOneLeft} {selectedSize}!
            </p>
          )}
          {showFewLeft && (
            <p style={{ margin: 0, fontSize: 12, color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={13} strokeWidth={2} /> {d.cart.onlyTwoLeft} {selectedSize}
            </p>
          )}
        </>
      )}

      {/* ── Add to cart / Notify me ───────────────────── */}
      {/* Show "Notify me" when a specific sold-out size is selected */}
      {selectedSize && isSoldOut(selectedSize) ? (
        <button
          onClick={handleNotifyClick}
          style={{
            background: 'transparent',
            color: '#111',
            border: '1px solid #111',
            padding: '16px 24px',
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Bell size={15} strokeWidth={1.8} /> {d.cart.notifyAvailable}
        </button>
      ) : (
        <button
          onClick={handleAdd}
          disabled={!canAdd && !(mustSelectSize && !selectedSize)}
          style={{
            background: added ? '#d7ff2f' : '#000',
            color: added ? '#0a0a0a' : '#fff',
            border: '1px solid #000',
            padding: '16px 24px',
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: canAdd || (mustSelectSize && !selectedSize) ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, opacity 0.2s',
            width: '100%',
            opacity: canAdd || (mustSelectSize && !selectedSize) ? 1 : 0.55,
          }}
        >
          {isInStock
            ? maxReached   ? d.cart.maxReached
            : added        ? d.cart.added
            : mustSelectSize && !selectedSize ? d.cart.selectSizeFirst
            : d.cart.addToCart
            : d.cart.outOfStock}
        </button>
      )}

      <a href={pathForLocale('/cart', locale)} style={{
        border: '1px solid #0a0a0a',
        padding: '14px 24px',
        borderRadius: 0,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        textAlign: 'center',
        textDecoration: 'none',
        color: 'inherit',
      }}>
        {d.cart.viewCart}
      </a>

      {/* Notify me popup */}
      {notifyPopup && (
        <NotifyMePopup
          product={product}
          size={selectedSize}
          initialEmail={user?.email || ''}
          locale={locale}
          onClose={() => setNotifyPopup(false)}
        />
      )}
    </div>
  )
}
