'use client'

import { useEffect } from 'react'
import { trackShippingOpen } from '../lib/track'

export default function ProductDetailsEventTracker({ product }) {
  useEffect(() => {
    if (typeof document === 'undefined' || !product) return undefined

    const tracked = new WeakSet()
    const nodes = Array.from(document.querySelectorAll('[data-product-track-section]'))

    function handleToggle(event) {
      const node = event.currentTarget
      if (!node?.open || tracked.has(node)) return
      tracked.add(node)

      if (node.dataset.productTrackSection === 'shipping_returns') {
        trackShippingOpen({ product, section: 'shipping_returns' })
      }
    }

    nodes.forEach((node) => node.addEventListener('toggle', handleToggle))
    return () => nodes.forEach((node) => node.removeEventListener('toggle', handleToggle))
  }, [product])

  return null
}
