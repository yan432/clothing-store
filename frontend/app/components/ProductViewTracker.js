'use client'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { trackProductView } from '../lib/track'

export default function ProductViewTracker({ productId }) {
  const { user } = useAuth()
  useEffect(() => {
    trackProductView(productId, user?.email ?? null)
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
