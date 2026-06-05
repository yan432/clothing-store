'use client'

import { useEffect } from 'react'
import { trackProductView, trackShippingOpen } from '../lib/track'

export default function ProductDetailsEventTracker({ product }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !product) return undefined

    let trackedView = false
    function trackView() {
      if (trackedView) return
      trackedView = true
      trackProductView(product)
    }

    if (window.__gaConfigured) {
      trackView()
    } else {
      window.addEventListener('ga-configured', trackView, { once: true })
    }
    const retryTimer = window.setTimeout(trackView, 2500)

    return () => {
      window.removeEventListener('ga-configured', trackView)
      window.clearTimeout(retryTimer)
    }
  }, [product])

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
