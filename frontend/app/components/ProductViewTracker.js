'use client'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { trackProductView } from '../lib/track'

export default function ProductViewTracker({ productId, slug, colorGroupId }) {
  const { user } = useAuth()
  useEffect(() => {
    trackProductView(
      { id: productId, slug, colorGroupId },
      user?.email ?? null,
    )
  }, [productId, slug, colorGroupId]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
