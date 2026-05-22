'use client'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { trackProductView } from '../lib/track'

export default function ProductViewTracker({ productId, slug, colorGroupId, name, price, category }) {
  const { user } = useAuth()
  useEffect(() => {
    trackProductView(
      { id: productId, slug, colorGroupId, name, price, category },
      user?.email ?? null,
    )
  }, [productId, slug, colorGroupId, name, price, category]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
