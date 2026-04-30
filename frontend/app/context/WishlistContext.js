'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getApiUrl } from '../lib/api'

const WishlistContext = createContext()

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [ids, setIds] = useState(new Set())   // Set of product_id numbers

  // Load wishlist whenever user changes
  const load = useCallback(async () => {
    if (!user?.email) { setIds(new Set()); return }
    try {
      const res = await fetch(
        getApiUrl(`/wishlist?email=${encodeURIComponent(user.email)}`)
      )
      if (!res.ok) return
      const data = await res.json()
      setIds(new Set(data))
    } catch {}
  }, [user?.email])

  useEffect(() => { load() }, [load])

  async function toggle(productId) {
    if (!user?.email) return false   // caller should show login prompt
    const numId = Number(productId)
    const isIn  = ids.has(numId)
    const next  = new Set(ids)
    if (isIn) {
      next.delete(numId)
      setIds(next)
      await fetch(
        getApiUrl(`/wishlist/${numId}?email=${encodeURIComponent(user.email)}`),
        { method: 'DELETE' }
      ).catch(() => {})
    } else {
      next.add(numId)
      setIds(next)
      await fetch(
        getApiUrl(`/wishlist/${numId}?email=${encodeURIComponent(user.email)}`),
        { method: 'POST' }
      ).catch(() => {})
    }
    return true
  }

  function isWishlisted(productId) {
    return ids.has(Number(productId))
  }

  return (
    <WishlistContext.Provider value={{ ids, toggle, isWishlisted, reload: load }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  return useContext(WishlistContext)
}
