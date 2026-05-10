'use client'
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { getApiUrl } from '../lib/api'

const WishlistContext = createContext()

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [ids, setIds] = useState(new Set())

  const load = useCallback(async () => {
    if (!user?.email) return
    try {
      const res = await fetch('/api/user/wishlist')
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
  }, [user?.email, load])

  const toggle = useCallback(async (productId) => {
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
        `/api/user/wishlist/${numId}`,
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
  }, [ids, user?.email])

  const isWishlisted = useCallback((productId) => {
    return ids.has(Number(productId))
  }, [ids])

  const value = useMemo(() => ({
    ids,
    toggle,
    isWishlisted,
    reload: load,
  }), [ids, toggle, isWishlisted, load])

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  return useContext(WishlistContext)
}
