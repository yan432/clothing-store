'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) setCart(JSON.parse(saved))
  }, [])

  function save(items) {
    setCart(items)
    localStorage.setItem('cart', JSON.stringify(items))
  }

  function addToCart(product) {
    const existing = cart.find(i => i.id === product.id && i.size === product.size)
    if (existing) {
      save(cart.map(i => (i.id === product.id && i.size === product.size) ? {...i, qty: i.qty + 1} : i))
    } else {
      save([...cart, {...product, price: parseFloat(product.price), qty: 1}])
    }
  }

  function removeFromCart(id, size) {
    save(cart.filter(i => !(i.id === id && i.size === size)))
  }

  function updateQty(id, qty, size) {
    if (qty < 1) return removeFromCart(id, size)
    save(cart.map(i => (i.id === id && i.size === size) ? {...i, qty} : i))
  }

  function clearCart() {
    save([])
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}