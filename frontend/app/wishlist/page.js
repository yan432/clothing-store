'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import { getApiUrl } from '../lib/api'
import { parseSizeOptionsFromTags } from '../lib/sizeOptions'

function WishlistCard({ product, sizeStock, onRemove }) {
  const { addToCart, setDrawerOpen } = useCart()
  const sizeOptions = parseSizeOptionsFromTags(product.tags)
  const [selectedSize, setSelectedSize] = useState('')
  const [added, setAdded] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Pre-select first in-stock size
  useEffect(() => {
    if (!sizeOptions.length) return
    const firstInStock = sizeOptions.find(s => (sizeStock[s] ?? 1) > 0)
    setSelectedSize(firstInStock || sizeOptions[0])
  }, [sizeOptions.join(','), JSON.stringify(sizeStock)])

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
  const isLowStock = inStock && stockForSize <= 5
  const canAdd     = inStock && (sizeOptions.length === 0 || !!selectedSize)

  function handleAddToCart() {
    const result = addToCart({
      id:              product.id,
      name:            product.name,
      price,
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
      border: '1px solid #ecece8', borderRadius: 16, overflow: 'hidden',
      background: '#fff', display: 'flex', flexDirection: 'column',
      opacity: removing ? 0.4 : 1, transition: 'opacity 0.2s',
    }}>
      {/* Image */}
      <div style={{ position: 'relative' }}>
        <a href={`/products/${product.slug || product.id}`} style={{ display: 'block', aspectRatio: '4/5', background: '#f5f5f3', overflow: 'hidden' }}>
          {img
            ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 12 }}>No image</div>
          }
        </a>
        {disc && (
          <span style={{ position: 'absolute', top: 10, left: 10, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6 }}>
            −{disc}%
          </span>
        )}
        {/* Remove button */}
        <button onClick={handleRemove} title="Remove from wishlist"
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#111" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <a href={`/products/${product.slug || product.id}`}
          style={{ fontSize: 14, fontWeight: 600, color: '#111', textDecoration: 'none', lineHeight: 1.3 }}>
          {product.name}
        </a>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: disc ? '#ef4444' : '#111' }}>
            €{price.toFixed(2)}
          </span>
          {disc && (
            <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>€{cmp.toFixed(2)}</span>
          )}
        </div>

        {/* Stock status */}
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          color: !inStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#16a34a' }}>
          {!inStock
            ? (selectedSize ? `${selectedSize} — out of stock` : 'Out of stock')
            : isLowStock ? `Only ${stockForSize} left`
            : 'In stock'}
        </p>

        {/* Size selector */}
        {sizeOptions.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {sizeOptions.map(s => {
              const qty = sizeStock[s] ?? null
              const outOfStock = qty !== null && qty === 0
              const isSelected = selectedSize === s
              return (
                <button key={s} onClick={() => !outOfStock && setSelectedSize(s)}
                  disabled={outOfStock}
                  title={outOfStock ? `${s} — out of stock` : s}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 7,
                    border: isSelected ? '1.5px solid #111' : '1px solid #ddd',
                    background: isSelected ? '#111' : outOfStock ? '#fafaf8' : '#fff',
                    color: isSelected ? '#fff' : outOfStock ? '#ccc' : '#444',
                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                    textDecoration: outOfStock ? 'line-through' : 'none',
                  }}>
                  {s}
                </button>
              )
            })}
          </div>
        )}

        {/* Add to cart */}
        <button onClick={handleAddToCart} disabled={!canAdd}
          style={{
            marginTop: 'auto', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: canAdd ? 'pointer' : 'not-allowed',
            background: added ? '#16a34a' : !canAdd ? '#e5e5e3' : '#111',
            color: !canAdd ? '#999' : '#fff',
            transition: 'background 0.2s',
          }}>
          {added ? '✓ Added to cart' : !inStock ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const { user } = useAuth()
  const { ids, toggle } = useWishlist()
  const [products, setProducts] = useState([])
  const [sizeStocks, setSizeStocks] = useState({})   // { [productId]: { S: 2, M: 0 } }
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!user?.email) { setLoading(false); return }
    setLoading(true)
    fetch(getApiUrl(`/wishlist/products?email=${encodeURIComponent(user.email)}`))
      .then(r => r.ok ? r.json() : [])
      .then(async data => {
        const list = Array.isArray(data) ? data : []
        setProducts(list)
        // Fetch size-stock for all products in parallel
        const entries = await Promise.all(
          list.map(p =>
            fetch(getApiUrl(`/products/${p.id}/size-stock`))
              .then(r => r.ok ? r.json() : {})
              .then(stock => [p.id, stock])
              .catch(() => [p.id, {}])
          )
        )
        setSizeStocks(Object.fromEntries(entries))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [user?.email, ids.size])

  async function handleRemove(productId) {
    await toggle(productId)
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  // Not logged in
  if (!loading && !user) return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 40, margin: '0 0 16px' }}>♡</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Save your favourites</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 28px', lineHeight: 1.6 }}>
        Sign in to save items and get notified when they go on sale or are about to sell out.
      </p>
      <a href="/auth" style={{ background: '#111', color: '#fff', padding: '13px 32px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
        Sign in
      </a>
    </main>
  )

  return (
    <main style={{ maxWidth: 1220, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          Wishlist
          {products.length > 0 && (
            <span style={{ fontSize: 15, fontWeight: 400, color: '#aaa', marginLeft: 10 }}>
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </h1>
        <a href="/products" style={{ fontSize: 13, color: '#888', textDecoration: 'none', fontWeight: 500 }}>
          Browse more →
        </a>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>Loading…</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <p style={{ fontSize: 40, margin: '0 0 16px' }}>♡</p>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 10px' }}>Your wishlist is empty</p>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 28px', lineHeight: 1.6 }}>
            Tap the heart on any product to save it here.<br/>
            We'll notify you when saved items go on sale or are almost sold out.
          </p>
          <a href="/products" style={{ background: '#111', color: '#fff', padding: '13px 32px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
            Browse products
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {products.map(p => (
            <WishlistCard
              key={p.id}
              product={p}
              sizeStock={sizeStocks[p.id] || {}}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </main>
  )
}
