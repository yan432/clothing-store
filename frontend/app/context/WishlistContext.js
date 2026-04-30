'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getApiUrl } from '../lib/api'

const WishlistContext = createContext()

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [ids, setIds] = useState(new Set())

  const load = useCallback(async () => {
    if (!user?.email) return
    try {
      const res = await fetch(getApiUrl(`/wishlist?email=${encodeURIComponent(user.email)}`))
      if (!res.ok) return
      const data = await res.json()
      setIds(new Set(data))
    } catch {}
  }, [user?.email])

  // Clear on logout; load on login — separated so token refresh never clears the list
  useEffect(() => {
    if (user?.email) {
      load()
    } else {
      setIds(new Set())
    }
  }, [user?.email]) // intentionally not depending on `load` to avoid extra calls

  async function toggle(productId) {
    if (!user?.email) return false
    const numId = Number(productId)
    const wasIn = ids.has(numId)

    // Optimistic update
    setIds(prev => {
      const next = new Set(prev)
      wasIn ? next.delete(numId) : next.add(numId)
      return next
    })

    try {
      const res = await fetch(
        getApiUrl(`/wishlist/${numId}?email=${encodeURIComponent(user.email)}`),
        { method: wasIn ? 'DELETE' : 'POST' }
      )
      if (!res.ok) throw new Error()
    } catch {
      // Rollback optimistic update on failure
      setIds(prev => {
        const next = new Set(prev)
        wasIn ? next.add(numId) : next.delete(numId)
        return next
      })
      return false
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
