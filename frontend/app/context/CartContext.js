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
    const existing = cart.find(i => i.id === product.id)
    if (existing) {
      save(cart.map(i => i.id === product.id ? {...i, qty: i.qty + 1} : i))
    } else {
      save([...cart, {...product, qty: 1}])
    }
  }

  function removeFromCart(id) {
    save(cart.filter(i => i.id !== id))
  }

  function updateQty(id, qty) {
    if (qty < 1) return removeFromCart(id)
    save(cart.map(i => i.id === id ? {...i, qty} : i))
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