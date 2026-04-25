'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { trackCartAdd } from '../lib/track'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) setCart(JSON.parse(saved))
  }, [])

  function save(items) {
    setCart(items)
    localStorage.setItem('cart', JSON.stringify(items))
  }

  function getMaxStock(item) {
    return Math.max(0, Number(item?.available_stock ?? item?.stock ?? 0))
  }

  function getQtyForProduct(productId, ignoreSize = null) {
    return cart.reduce((sum, item) => {
      if (item.id !== productId) return sum
      if (ignoreSize != null && item.size === ignoreSize) return sum
      return sum + item.qty
    }, 0)
  }

  function addToCart(product) {
    const maxStock = getMaxStock(product)
    if (maxStock <= 0) return { ok: false, reason: 'out_of_stock' }
    const currentQty = getQtyForProduct(product.id)
    if (currentQty >= maxStock) return { ok: false, reason: 'max_reached' }

    const existing = cart.find(i => i.id === product.id && i.size === product.size)
    if (existing) {
      save(cart.map(i => (i.id === product.id && i.size === product.size) ? {...i, qty: i.qty + 1} : i))
    } else {
      save([...cart, {...product, price: parseFloat(product.price), qty: 1}])
    }
    trackCartAdd(product.id)
    setDrawerOpen(true)
    return { ok: true }
  }

  function removeFromCart(id, size) {
    save(cart.filter(i => !(i.id === id && i.size === size)))
  }

  function updateQty(id, qty, size) {
    if (qty < 1) return removeFromCart(id, size)
    const target = cart.find((i) => i.id === id && i.size === size)
    if (!target) return

    const maxStock = getMaxStock(target)
    const otherQty = cart.reduce((sum, item) => {
      if (item.id !== id) return sum
      if (item.size === size) return sum
      return sum + item.qty
    }, 0)
    const maxForLine = Math.max(0, maxStock - otherQty)
    if (maxForLine < 1) return removeFromCart(id, size)
    const nextQty = Math.min(qty, maxForLine)
    save(cart.map(i => (i.id === id && i.size === size) ? {...i, qty: nextQty} : i))
  }

  function clearCart() { save([]) }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count, drawerOpen, setDrawerOpen }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}