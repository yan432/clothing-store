'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getApiUrl } from '../lib/api'
import { parseSizeOptionsFromTags } from '../lib/sizeOptions'
import { getMessages, localeFromPathname, pathForLocale, UK_LOCALE } from '../lib/i18n'
import { currencyForLocale, priceForLocale, comparePriceForLocale, formatPrice } from '../lib/money'
import { useUahRate } from '../lib/useUahRate'

function WishlistItem({ product, onRemove, locale, labels }) {
  const { addToCart, setDrawerOpen: openCart } = useCart()
  const uahRate = useUahRate(locale === UK_LOCALE)
  const currency = currencyForLocale(locale)
  const sizeOptions = parseSizeOptionsFromTags(product.tags)
  const sizeStock = product.size_stock || {}
  const isSizeAvailable = (s) => sizeStock[s] === undefined ? true : sizeStock[s] > 0
  const firstAvailable = sizeOptions.find(s => isSizeAvailable(s)) || sizeOptions[0] || ''
  const [selectedSize, setSelectedSize] = useState(firstAvailable)
  const [added, setAdded] = useState(false)

  const imgs  = Array.isArray(product.image_urls) && product.image_urls.length
    ? product.image_urls : (product.image_url ? [product.image_url] : [])
  const img   = imgs[0]
  const price = Number(product.price || 0)
  const cmp   = Number(product.compare_price || 0)
  const disc  = cmp > price ? Math.round((1 - price / cmp) * 100) : null
  const totalStock = product.available_stock ?? product.stock ?? 0
  const allSizesUnavailable = sizeOptions.length > 0 && sizeOptions.every(s => !isSizeAvailable(s))
  const isOutOfStock = totalStock <= 0 || allSizesUnavailable
  const selectedSizeAvailable = !selectedSize || isSizeAvailable(selectedSize)
  const canAdd = !isOutOfStock && (sizeOptions.length === 0 || Boolean(selectedSize)) && selectedSizeAvailable

  function handleAddToCart() {
    if (!canAdd) return
    const result = addToCart({
      id:              product.id,
      name:            product.name,
      price:           price,
      price_uah:        product.price_uah ?? null,
      compare_price_uah: product.compare_price_uah ?? null,
      image_url:       img || '',
      slug:            product.slug,
      size:            selectedSize || '',
      available_stock: product.available_stock ?? product.stock ?? 0,
    })
    if (result?.ok !== false) {
      setAdded(true)
      setTimeout(() => setAdded(false), 1800)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: '1px solid #0a0a0a' }}>
      {/* Image */}
      <a href={pathForLocale(`/products/${product.slug || product.id}`, locale)}
        style={{ flexShrink: 0, width: 72, height: 90, borderRadius: 0, overflow: 'hidden', background: '#fff', border: 'none', display: 'block' }}>
        {img
          ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%' }} />
        }
      </a>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <a href={pathForLocale(`/products/${product.slug || product.id}`, locale)}
            style={{ fontSize: 13, fontWeight: 900, color: '#111', textDecoration: 'none', lineHeight: 1.25, flex: 1, letterSpacing:'0.04em', textTransform:'uppercase' }}>
            {product.name}
          </a>
          {/* Remove button */}
          <button onClick={() => onRemove(product.id)} title={labels.remove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#bbb', flexShrink: 0, lineHeight: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: disc ? '#f02a2a' : '#111' }}>
            {formatPrice(priceForLocale(product, locale, uahRate), currency)}
          </span>
          {disc && (
            <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>{formatPrice(comparePriceForLocale(product, locale, uahRate), currency)}</span>
          )}
        </div>

        {/* Size selector */}
        {sizeOptions.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
            {sizeOptions.map(s => {
              const avail = isSizeAvailable(s)
              const active = selectedSize === s
              return (
                <button key={s} onClick={() => avail && setSelectedSize(s)}
                  style={{
                    padding: '3px 8px', fontSize: 11, fontWeight: 900, borderRadius: 0,
                    cursor: avail ? 'pointer' : 'not-allowed',
                    border: active ? '1.5px solid #111' : '1px solid #ddd',
                    background: active ? '#111' : '#fff',
                    color: active ? '#fff' : avail ? '#444' : '#ccc',
                    textDecoration: avail ? 'none' : 'line-through',
                    opacity: avail ? 1 : 0.5,
                  }}>
                  {s}
                </button>
              )
            })}
          </div>
        )}

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={!canAdd}
          style={{
            marginTop: 6, padding: '8px 12px', borderRadius: 0, fontSize: 11, fontWeight: 900,
            letterSpacing:'0.08em', textTransform:'uppercase',
            border: '1px solid #111', cursor: canAdd ? 'pointer' : 'default',
            background: added ? '#d7ff2f' : isOutOfStock ? '#e6e6e0' : !selectedSizeAvailable ? '#e6e6e0' : '#111',
            color: added ? '#0a0a0a' : (isOutOfStock || !selectedSizeAvailable) ? '#999' : '#fff',
            transition: 'background 0.2s',
          }}>
          {added ? labels.added : isOutOfStock ? labels.outOfStock : !selectedSizeAvailable ? labels.outOfStock : labels.addToCart}
        </button>
      </div>
    </div>
  )
}

export default function WishlistDrawer() {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const { drawerOpen, setDrawerOpen, ids, toggle } = useWishlist()
  const { user } = useAuth()
  const { setDrawerOpen: openCart } = useCart()

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [mounted, setMounted]   = useState(false)

  // Mount/unmount with animation
  useEffect(() => {
    let frameOne
    let frameTwo
    let closeTimer
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
      frameOne = requestAnimationFrame(() => {
        setMounted(true)
        frameTwo = requestAnimationFrame(() => setVisible(true))
      })
    } else {
      document.body.style.overflow = ''
      frameOne = requestAnimationFrame(() => setVisible(false))
      closeTimer = setTimeout(() => setMounted(false), 320)
    }
    return () => {
      if (frameOne) cancelAnimationFrame(frameOne)
      if (frameTwo) cancelAnimationFrame(frameTwo)
      clearTimeout(closeTimer)
    }
  }, [drawerOpen])

  // Load products whenever drawer opens or ids change
  useEffect(() => {
    if (!drawerOpen || !user?.email) return
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return null
      setLoading(true)
      return fetch('/api/user/wishlist/products')
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (!cancelled) setProducts(Array.isArray(data) ? data : []) })
        .catch(() => { if (!cancelled) setProducts([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    })
    return () => { cancelled = true }
  }, [drawerOpen, user?.email, ids.size])

  async function handleRemove(productId) {
    await toggle(productId)
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  function close() { setDrawerOpen(false) }

  if (!mounted) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={close} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.32s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 301,
        width: 'min(420px, 100vw)',
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0,0,1)',
        boxShadow: 'none',
        borderLeft: '1px solid #0a0a0a',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #0a0a0a', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, letterSpacing:'0.08em', textTransform:'uppercase' }}>{d.wishlistPage.title}</h2>
            {products.length > 0 && (
              <span style={{ fontSize: 12, color: '#aaa' }}>({products.length})</span>
            )}
          </div>
          <button onClick={close} style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius:0, cursor: 'pointer', fontSize: 24, color: '#0a0a0a', lineHeight: 1, padding: 0, width:34, height:34 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {!user ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <p style={{ fontSize: 32, margin: '0 0 12px' }}>♡</p>
              <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>{d.wishlistPage.drawerSignInTitle}</p>
              <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>{d.wishlistPage.drawerSignInBody}</p>
              <a href={pathForLocale('/auth', locale)} onClick={close}
                style={{ background: '#111', color: '#fff', padding: '12px 28px', borderRadius: 0, fontSize: 12, fontWeight: 900, letterSpacing:'0.08em', textTransform:'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                {d.wishlistPage.signIn}
              </a>
            </div>
          ) : loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>{d.wishlistPage.loading}</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <p style={{ fontSize: 32, margin: '0 0 12px' }}>♡</p>
              <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>{d.wishlistPage.emptyTitle}</p>
              <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>
                {d.wishlistPage.drawerEmptyBody}
              </p>
              <a href={pathForLocale('/products', locale)} onClick={close}
                style={{ background: '#111', color: '#fff', padding: '12px 28px', borderRadius: 0, fontSize: 12, fontWeight: 900, letterSpacing:'0.08em', textTransform:'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                {d.wishlistPage.browseProducts}
              </a>
            </div>
          ) : (
            <div>
              {products.map(p => (
                <WishlistItem key={p.id} product={p} onRemove={handleRemove} locale={locale} labels={d.wishlistPage} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {products.length > 0 && (
          <div style={{ borderTop: '1px solid #0a0a0a', padding: '16px 20px', flexShrink: 0 }}>
            <a href={pathForLocale('/wishlist', locale)} onClick={close}
              style={{ display: 'block', textAlign: 'center', fontSize: 13, color: '#888', textDecoration: 'none' }}>
              {d.wishlistPage.drawerViewFull}
            </a>
          </div>
        )}
      </div>
    </>
  )
}
