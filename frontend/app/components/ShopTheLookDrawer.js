'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { getApiUrl } from '../lib/api'
import { useCart } from '../context/CartContext'
import { parseSizeOptionsFromTags, SIZE_PRESET_OPTIONS } from '../lib/sizeOptions'
import { getMessages, localeFromPathname, localizeProduct, pathForLocale, UK_LOCALE } from '../lib/i18n'
import { currencyForLocale, priceForLocale, formatPrice } from '../lib/money'
import { useUahRate } from '../lib/useUahRate'

function sortSizes(arr) {
  return [...arr].sort((a, b) => {
    const ia = SIZE_PRESET_OPTIONS.indexOf(a)
    const ib = SIZE_PRESET_OPTIONS.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

function LookItem({ product, locale }) {
  const d = getMessages(locale)
  const displayProduct = localizeProduct(product, locale)
  const uahRate = useUahRate(locale === UK_LOCALE)
  const { addToCart } = useCart()
  const productTags = product?.tags
  const sizes = useMemo(() => sortSizes(parseSizeOptionsFromTags(productTags)), [productTags])
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : '')
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const sizeStock = displayProduct.size_stock || {}
  const isSizeAvailable = (s) => sizeStock[s] === undefined ? true : sizeStock[s] > 0
  const allSizesUnavailable = sizes.length > 0 && sizes.every(s => !isSizeAvailable(s))
  const totalStock = displayProduct.available_stock ?? displayProduct.stock ?? 0
  const isOutOfStock = totalStock <= 0 || allSizesUnavailable

  const mustSelectSize = sizes.length > 1
  const canAdd = !isOutOfStock && (!mustSelectSize || Boolean(size)) && (size === '' || isSizeAvailable(size))

  function handleAdd() {
    setError('')
    if (!canAdd) return
    const result = addToCart({ ...displayProduct, size: size || sizes[0] || null })
    if (!result?.ok) {
      setError(result?.reason === 'max_reached' ? d.cart.maxReachedShort : d.cart.outOfStock)
      return
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      gap: 16,
      padding: '20px 0',
      borderBottom: '1px solid #0a0a0a',
    }}>
      <a href={pathForLocale(`/products/${displayProduct.slug || displayProduct.id}`, locale)}
        style={{ display: 'block', aspectRatio: '4/5', background: '#fff', border: 'none', borderRadius: 0, overflow: 'hidden' }}>
        {displayProduct.image_url && (
          <img src={displayProduct.image_url} alt={displayProduct.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </a>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <a href={pathForLocale(`/products/${displayProduct.slug || displayProduct.id}`, locale)}
            style={{ fontSize: 14, fontWeight: 900, color: '#111', textDecoration: 'none', display: 'block', marginBottom: 4, letterSpacing:'0.04em', textTransform:'uppercase' }}>
            {displayProduct.name}
          </a>
          <p style={{ fontSize: 14, color: '#444', margin: 0 }}>
            {formatPrice(priceForLocale(displayProduct, locale, uahRate), currencyForLocale(locale))}
          </p>
        </div>

        {!added && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            {sizes.length > 1 && !isOutOfStock && (
              <select
                value={size}
                onChange={e => setSize(e.target.value)}
                style={{
                  border: '1.5px solid #111', borderRadius: 0,
                  padding: '10px 12px', fontSize: 13, fontWeight: 600,
                  background: '#fff', flex: '1 1 80px', minWidth: 0,
                  appearance: 'none', WebkitAppearance: 'none',
                }}
              >
                <option value="" disabled>{d.cart.size}</option>
                {sizes.map(s => (
                  <option key={s} value={s} disabled={!isSizeAvailable(s)}>
                    {isSizeAvailable(s) ? s : `${s} · ${d.cart.soldOut}`}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleAdd}
              disabled={isOutOfStock || !canAdd}
              style={{
                background: isOutOfStock ? '#bbb' : canAdd ? '#111' : '#bbb',
                color: '#fff', border: 'none',
                padding: '10px 16px', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: (isOutOfStock || !canAdd) ? 'not-allowed' : 'pointer',
                flex: '2 1 auto', whiteSpace: 'nowrap',
              }}>
              {isOutOfStock ? d.products.badges.soldOut : canAdd ? d.cart.addToCart : d.cart.selectSizeFirst}
            </button>
          </div>
        )}
        {added && (
          <div style={{
            background: '#aaa', color: '#fff',
            padding: '10px 16px', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center',
          }}>
            {d.cart.added}
          </div>
        )}
        {error && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>}
      </div>
    </div>
  )
}

export default function ShopTheLookDrawer({ open, productIds = [], shopHref, onClose }) {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!productIds || productIds.length === 0) { setProducts([]); return }
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
        if (!res.ok) throw new Error()
        const all = await res.json()
        const map = new Map((all || []).map(p => [p.id, p]))
        const ordered = productIds.map(id => map.get(id)).filter(Boolean)
        setProducts(ordered)
      } catch { setProducts([]) }
      finally { setLoading(false) }
    })()
  }, [open, productIds])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        animation: 'fadeIn 200ms ease',
      }}>
      <aside
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: '100%', maxWidth: 460,
          background: '#fff',
          borderLeft: '1px solid #0a0a0a',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #0a0a0a',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {d.cart.shopLook}
          </h2>
          <button onClick={onClose} aria-label={d.cart.close}
            style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius:0, cursor: 'pointer', padding: 6 }}>
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>{d.cart.loading}</p>
          ) : products.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>{d.cart.noLinkedProducts}</p>
          ) : (
            products.map(p => <LookItem key={p.id} product={p} locale={locale} />)
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 24, borderTop: '1px solid #0a0a0a' }}>
          <a href={pathForLocale(shopHref || '/products', locale)}
            style={{
              display: 'block', textAlign: 'center',
              border: '1px solid #111', color: '#111',
              padding: '14px 16px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}>
            {d.cart.continueShopping}
          </a>
        </div>
      </aside>
    </div>
  )
}
