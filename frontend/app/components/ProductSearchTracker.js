'use client'

import { useEffect } from 'react'
import { trackSearch } from '../lib/track'

export default function ProductSearchTracker({ search, resultCount }) {
  useEffect(() => {
    trackSearch({ searchString: search, resultCount })
  }, [search, resultCount])

  return null
}
