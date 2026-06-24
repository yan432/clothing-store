'use client'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import { getApiUrl } from '../lib/api'
import { parseSizeOptionsFromTags } from '../lib/sizeOptions'
import NotifyMePopup from '../components/NotifyMePopup'
import { getMessages, pathForLocale, UK_LOCALE } from '../lib/i18n'
import { currencyForLocale, priceForLocale, comparePriceForLocale, formatPrice } from '../lib/money'
import { useUahRate } from '../lib/useUahRate'

function WishlistCard({ product, sizeStock, onRemove, locale = 'en', labels }) {
  const { addToCart, setDrawerOpen } = useCart()
  const uahRate = useUahRate(locale === UK_LOCALE)
  const currency = currencyForLocale(locale)
  const { user } = useAuth()
  const productTags = product.tags
  const sizeOptions = useMemo(() => parseSizeOptionsFromTags(productTags), [productTags])
  const [selectedSizeInput, setSelectedSizeInput] = useState('')
  const [added, setAdded] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [notifyPopup, setNotifyPopup] = useState(false)
  const firstInStock = sizeOptions.find(s => (sizeStock[s] ?? 1) > 0)
  const selectedSize = sizeOptions.includes(selectedSizeInput)
    ? selectedSizeInput
    : firstInStock || sizeOptions[0] || ''

  const imgs  = Array.isArray(product.image_urls) && product.image_urls.length
    ? product.image_urls : (product.image_url ? [product.image_url] : [])
  const img   = imgs[0]
  const price = Number(product.price || 0)
  const cmp   = Number(product.compare_price || 0)
  const disc  = cmp > price ? Math.round((1 - price / cmp) * 100) : null

  // Stock for selected size (or overall if no sizes)
  const stockForSize = sizeOptions.length
    ? (selectedSize ? (sizeStock[selectedSize] ?? 0) : 0)
    : (product.available_stock ?? product.stock ?? 0)
  const inStock    = stockForSize > 0
  const isLowStock = inStock && stockForSize <= 2  // only at 1–2 units
  const canAdd     = inStock && (sizeOptions.length === 0 || !!selectedSize)

  // Show "Notify when available" when selected size is out of stock,
  // or when no-size product is out of stock
  const showNotify = sizeOptions.length
    ? (!!selectedSize && !inStock)
    : !inStock

  function handleAddToCart() {
    const result = addToCart({
      id:              product.id,
      name:            product.name,
      price,
      price_uah:        product.price_uah ?? null,
      compare_price_uah: product.compare_price_uah ?? null,
      image_url:       img || '',
      slug:            product.slug,
      size:            selectedSize || '',
      available_stock: stockForSize,
    })
    if (result?.ok !== false) {
      setAdded(true)
      setDrawerOpen(true)
      setTimeout(() => setAdded(false), 2000)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    await onRemove(product.id)
  }

  return (
    <div style={{
      border: 'none', borderRadius: 0, overflow: 'hidden',
      background: '#fff', display: 'flex', flexDirection: 'column',
      opacity: removing ? 0.4 : 1, transition: 'opacity 0.2s',
    }}>
      {/* Image */}
      <div style={{ position: 'relative' }}>
        <a href={pathForLocale(`/products/${product.slug || product.id}`, locale)} className="wishlist-card-img" style={{ display: 'block', aspectRatio: '4/5', background: '#fff', overflow: 'hidden', borderRadius: 0 }}>
          {img
            ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 12 }}>{labels.noImage}</div>
          }
        </a>
        {disc && (
          <span style={{ position: 'absolute', top: 10, left: 10, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 0 }}>
            −{disc}%
          </span>
        )}
        {/* Remove button */}
        <button onClick={handleRemove} title={labels.remove}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 30, height: 30, borderRadius: 0,
            background: 'rgba(255,255,255,0.92)', border: '1px solid #0a0a0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#111" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="wishlist-card-info" style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <a href={pathForLocale(`/products/${product.slug || product.id}`, locale)}
          style={{ fontSize: 14, fontWeight: 600, color: '#111', textDecoration: 'none', lineHeight: 1.3 }}>
          {product.name}
        </a>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: disc ? '#ef4444' : '#111' }}>
            {formatPrice(priceForLocale(product, locale, uahRate), currency)}
          </span>
          {disc && (
            <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>{formatPrice(comparePriceForLocale(product, locale, uahRate), currency)}</span>
          )}
        </div>

        {/* Stock status */}
        {isLowStock && (
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#f59e0b' }}>
            {labels.onlyLeftPrefix} {stockForSize} {labels.onlyLeftSuffix}
          </p>
        )}

        {/* Size selector */}
        {sizeOptions.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {sizeOptions.map(s => {
              const qty = sizeStock[s] ?? null
              const outOfStock = qty !== null && qty === 0
              const isSelected = selectedSize === s
              return (
                <button key={s} onClick={() => setSelectedSizeInput(s)}
                  title={outOfStock ? `${s} — ${labels.outOfStock}` : s}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 700, borderRadius: 0,
                    border: '1px solid #0a0a0a',
                    background: isSelected ? (outOfStock ? '#fff' : '#111') : '#fff',
                    color: isSelected ? (outOfStock ? '#888' : '#fff') : outOfStock ? '#ccc' : '#444',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}>
                  {s}
                </button>
              )
            })}
          </div>
        )}

        {/* Add to cart OR notify when back in stock */}
        {showNotify ? (
          <button onClick={() => setNotifyPopup(true)}
            style={{
              marginTop: 'auto', padding: '10px', borderRadius: 0, fontSize: 13, fontWeight: 800,
              border: '1px solid #111', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
              background: '#fff', color: '#111',
            }}>
            {labels.notify}
          </button>
        ) : (
          <button onClick={handleAddToCart} disabled={!canAdd}
            style={{
              marginTop: 'auto', padding: '10px', borderRadius: 0, fontSize: 13, fontWeight: 800,
              border: '1px solid #111', cursor: canAdd ? 'pointer' : 'not-allowed',
              background: added ? '#16a34a' : !canAdd ? '#fff' : '#111',
              color: !canAdd ? '#999' : '#fff',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'background 0.2s',
            }}>
            {added ? labels.added : labels.addToCart}
          </button>
        )}
      </div>

      {/* Notify me popup */}
      {notifyPopup && (
        <NotifyMePopup
          product={product}
          size={selectedSize || sizeOptions[0] || ''}
          initialEmail={user?.email || ''}
          locale={locale}
          onClose={() => setNotifyPopup(false)}
        />
      )}
    </div>
  )
}

export default function WishlistPage({ locale = 'en' }) {
  const d = getMessages(locale)
  const { user } = useAuth()
  const { toggle } = useWishlist()
  const [products, setProducts] = useState([])
  const [sizeStocks, setSizeStocks] = useState({})   // { [productId]: { S: 2, M: 0 } }
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return null
      if (!user?.email) {
        setProducts([])
        setSizeStocks({})
        setLoading(false)
        return null
      }
      setLoading(true)
      return fetch('/api/user/wishlist/products')
        .then(r => r.ok ? r.json() : [])
        .then(async data => {
          if (cancelled) return
          // Drop hidden and archived products
          const raw = Array.isArray(data) ? data : []
          const list = raw.filter(p =>
            !p.is_hidden && !(p.name || '').startsWith('[ARCHIVED]')
          )

          setProducts(list)

          // Fetch size-stock for all visible products in parallel
          const entries = await Promise.all(
            list.map(p =>
              fetch(getApiUrl(`/products/${p.id}/size-stock`))
                .then(r => r.ok ? r.json() : {})
                .then(stock => [p.id, stock])
                .catch(() => [p.id, {}])
            )
          )
          if (!cancelled) setSizeStocks(Object.fromEntries(entries))
        })
        .catch(() => { if (!cancelled) setProducts([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    })
    return () => { cancelled = true }
  }, [user?.email])  // only reload when user changes — removals handled locally

  async function handleRemove(productId) {
    // Remove locally immediately, then sync with backend
    setProducts(prev => prev.filter(p => p.id !== productId))
    await toggle(productId)
    // toggle() has rollback built in — if it fails, ids revert but page state stays removed
    // (acceptable UX: next page load will re-fetch correct state)
  }

  // Not logged in
  if (!loading && !user) return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 40, margin: '0 0 16px' }}>♡</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>{d.wishlistPage.saveTitle}</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 28px', lineHeight: 1.6 }}>
        {d.wishlistPage.saveBody}
      </p>
      <a href={pathForLocale('/auth', locale)} style={{ background: '#111', color: '#fff', padding: '13px 32px', borderRadius: 0, fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', border: '1px solid #111' }}>
        {d.wishlistPage.signIn}
      </a>
    </main>
  )

  return (
    <main className="wishlist-main" style={{ maxWidth: 1220, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div className="wishlist-header" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          {d.wishlistPage.title}
          {products.length > 0 && (
            <span style={{ fontSize: 15, fontWeight: 400, color: '#aaa', marginLeft: 10 }}>
              {products.length} {products.length === 1 ? d.wishlistPage.item : d.wishlistPage.items}
            </span>
          )}
        </h1>
        <a href={pathForLocale('/products', locale)} style={{ fontSize: 13, color: '#888', textDecoration: 'none', fontWeight: 500 }}>
          {d.wishlistPage.browseMore}
        </a>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>{d.wishlistPage.loading}</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <p style={{ fontSize: 40, margin: '0 0 16px' }}>♡</p>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 10px' }}>{d.wishlistPage.emptyTitle}</p>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 28px', lineHeight: 1.6 }}>
            {d.wishlistPage.emptyBodyFirst}<br/>
            {d.wishlistPage.emptyBodySecond}
          </p>
          <a href={pathForLocale('/products', locale)} style={{ background: '#111', color: '#fff', padding: '13px 32px', borderRadius: 0, fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', border: '1px solid #111' }}>
            {d.wishlistPage.browseProducts}
          </a>
        </div>
      ) : (
        <div className="wishlist-grid">
          {products.map(p => (
            <WishlistCard
              key={p.id}
              product={p}
              sizeStock={sizeStocks[p.id] || {}}
              onRemove={handleRemove}
              locale={locale}
              labels={d.wishlistPage}
            />
          ))}
        </div>
      )}
    </main>
  )
}
