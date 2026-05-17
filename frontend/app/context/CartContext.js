'use client'
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { trackCartAdd } from '../lib/track'
import { getApiUrl } from '../lib/api'

const CartContext = createContext()

function readStoredCart() {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) || [] : []
  } catch {
    localStorage.removeItem('cart') // corrupted — reset silently
    return []
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const initial = readStoredCart()
    const hydrateTimer = setTimeout(() => {
      if (!cancelled) setCart(initial)
    }, 0)

    // Sync against server: remove items whose products are now hidden/archived.
    if (initial.length === 0) {
      return () => {
        cancelled = true
        clearTimeout(hydrateTimer)
      }
    }
    ;(async () => {
      try {
        const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
        if (!res.ok) return
        const products = await res.json()
        if (!Array.isArray(products)) return
        const visible = new Set(
          products
            .filter(p => !p.is_hidden && !(p.name || '').startsWith('[ARCHIVED]'))
            .map(p => p.id)
        )
        const filtered = initial.filter(item => visible.has(item.id))
        if (filtered.length !== initial.length) {
          if (!cancelled) {
            clearTimeout(hydrateTimer)
            setCart(filtered)
          }
          localStorage.setItem('cart', JSON.stringify(filtered))
        }
      } catch {} // network error: keep existing cart
    })()
    return () => {
      cancelled = true
      clearTimeout(hydrateTimer)
    }
  }, [])

  const save = useCallback((items) => {
    setCart(items)
    localStorage.setItem('cart', JSON.stringify(items))
  }, [])

  const getMaxStock = useCallback((item) => {
    return Math.max(0, Number(item?.available_stock ?? item?.stock ?? 0))
  }, [])

  // How many units of a specific (product, size) combination are already in the cart
  const getQtyForSize = useCallback((productId, size) => {
    return cart.reduce((sum, item) =>
      item.id === productId && item.size === size ? sum + item.qty : sum, 0)
  }, [cart])

  const addToCart = useCallback((product) => {
    const maxStock = getMaxStock(product)
    if (maxStock <= 0) return { ok: false, reason: 'out_of_stock' }
    // Per-size limit: compare only the qty already in cart for this exact (product, size)
    const currentSizeQty = getQtyForSize(product.id, product.size)
    if (currentSizeQty >= maxStock) return { ok: false, reason: 'max_reached' }

    const existing = cart.find(i => i.id === product.id && i.size === product.size)
    if (existing) {
      // Also refresh available_stock so the stored value stays per-size accurate
      save(cart.map(i => (i.id === product.id && i.size === product.size)
        ? { ...i, qty: i.qty + 1, available_stock: maxStock }
        : i))
    } else {
      save([...cart, {...product, price: parseFloat(product.price), qty: 1}])
    }
    trackCartAdd({
      id:            product.id,
      slug:          product.slug,
      size:          product.size,
      colorGroupId:  product.color_group_id,
    })
    setDrawerOpen(true)
    return { ok: true }
  }, [cart, getMaxStock, getQtyForSize, save])

  const removeFromCart = useCallback((id, size) => {
    save(cart.filter(i => !(i.id === id && i.size === size)))
  }, [cart, save])

  const updateQty = useCallback((id, qty, size) => {
    if (qty < 1) return removeFromCart(id, size)
    const target = cart.find((i) => i.id === id && i.size === size)
    if (!target) return

    const maxStock = getMaxStock(target)
    if (maxStock < 1) return removeFromCart(id, size)
    // Cap at per-size stock (each size is independent)
    const nextQty = Math.min(qty, maxStock)
    save(cart.map(i => (i.id === id && i.size === size) ? {...i, qty: nextQty} : i))
  }, [cart, getMaxStock, removeFromCart, save])

  const clearCart = useCallback(() => { save([]) }, [save])

  /**
   * Add multiple items in a single save() call.
   * `entries` = [{ product, qty }] where product may include `size`.
   * Used by Meta Shops checkout URL where several (product, qty) pairs arrive at once.
   */
  const addManyToCart = useCallback((entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return
    const next = [...cart]
    for (const { product, qty } of entries) {
      if (!product) continue
      const maxStock = getMaxStock(product)
      if (maxStock <= 0) continue
      const desiredQty = Math.max(1, Number(qty) || 1)
      const idx = next.findIndex(i => i.id === product.id && i.size === product.size)
      if (idx >= 0) {
        const totalQty = Math.min(maxStock, next[idx].qty + desiredQty)
        next[idx] = { ...next[idx], qty: totalQty, available_stock: maxStock }
      } else {
        next.push({
          ...product,
          price: parseFloat(product.price),
          qty:   Math.min(maxStock, desiredQty),
        })
      }
      trackCartAdd({
        id:           product.id,
        slug:         product.slug,
        size:         product.size,
        colorGroupId: product.color_group_id,
      })
    }
    save(next)
  }, [cart, getMaxStock, save])

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = cart.reduce((sum, i) => sum + i.qty, 0)
  const value = useMemo(() => ({
    cart,
    addToCart,
    addManyToCart,
    removeFromCart,
    updateQty,
    clearCart,
    total,
    count,
    drawerOpen,
    setDrawerOpen,
  }), [cart, addToCart, addManyToCart, removeFromCart, updateQty, clearCart, total, count, drawerOpen])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
