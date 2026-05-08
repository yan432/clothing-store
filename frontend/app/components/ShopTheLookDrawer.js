'use client'
import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { getApiUrl } from '../lib/api'
import { useCart } from '../context/CartContext'
import { parseSizeOptionsFromTags, SIZE_PRESET_OPTIONS } from '../lib/sizeOptions'

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

function priceLabel(p) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
    .format(Number(p || 0))
}

function LookItem({ product }) {
  const { addToCart } = useCart()
  const sizes = useMemo(() => sortSizes(parseSizeOptionsFromTags(product?.tags)), [product?.tags])
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : '')
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const sizeStock = product.size_stock || {}
  const isSizeAvailable = (s) => sizeStock[s] === undefined ? true : sizeStock[s] > 0
  const allSizesUnavailable = sizes.length > 0 && sizes.every(s => !isSizeAvailable(s))
  const totalStock = product.available_stock ?? product.stock ?? 0
  const isOutOfStock = totalStock <= 0 || allSizesUnavailable

  const mustSelectSize = sizes.length > 1
  const canAdd = !isOutOfStock && (!mustSelectSize || Boolean(size)) && (size === '' || isSizeAvailable(size))

  function handleAdd() {
    setError('')
    if (!canAdd) return
    const result = addToCart({ ...product, size: size || sizes[0] || null })
    if (!result?.ok) {
      setError(result?.reason === 'max_reached' ? 'Max reached' : 'Out of stock')
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
      borderBottom: '1px solid #eee',
    }}>
      <a href={`/products/${product.slug || product.id}`}
        style={{ display: 'block', aspectRatio: '4/5', background: '#f5f5f3', borderRadius: 4, overflow: 'hidden' }}>
        {product.image_url && (
          <img src={product.image_url} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </a>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <a href={`/products/${product.slug || product.id}`}
            style={{ fontSize: 15, fontWeight: 600, color: '#111', textDecoration: 'none', display: 'block', marginBottom: 4 }}>
            {product.name}
          </a>
          <p style={{ fontSize: 14, color: '#444', margin: 0 }}>
            {priceLabel(product.price)}
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
                <option value="" disabled>Size</option>
                {sizes.map(s => (
                  <option key={s} value={s} disabled={!isSizeAvailable(s)}>
                    {isSizeAvailable(s) ? s : `${s} · sold out`}
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
              {isOutOfStock ? 'Sold out' : canAdd ? 'Add to cart' : 'Select size'}
            </button>
          </div>
        )}
        {added && (
          <div style={{
            background: '#aaa', color: '#fff',
            padding: '10px 16px', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center',
          }}>
            Added to cart
          </div>
        )}
        {error && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>}
      </div>
    </div>
  )
}

export default function ShopTheLookDrawer({ open, productIds = [], shopHref, onClose }) {
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
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #eee',
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>
            Shop the Look
          </h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>Loading...</p>
          ) : products.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>No products linked to this look yet.</p>
          ) : (
            products.map(p => <LookItem key={p.id} product={p} />)
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 24, borderTop: '1px solid #eee' }}>
          <a href={shopHref || '/products'}
            style={{
              display: 'block', textAlign: 'center',
              border: '1.5px solid #111', color: '#111',
              padding: '14px 16px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textDecoration: 'none',
            }}>
            Continue shopping
          </a>
        </div>
      </aside>
    </div>
  )
}
