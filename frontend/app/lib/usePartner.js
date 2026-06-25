'use client'
import { useEffect, useState } from 'react'
import { getPartnerApiUrl } from './api'

/**
 * Returns { isPartner, brand, loading } for the currently logged-in user.
 * Hits /partner/me once on mount when there's a Supabase session cookie.
 *
 * Anonymous visitors never make the request (no cookie → return loading=false,
 * isPartner=false).
 */
export function usePartner(user) {
  const [state, setState] = useState({ isPartner: false, brand: null, loading: Boolean(user) })

  useEffect(() => {
    if (!user) {
      setState({ isPartner: false, brand: null, loading: false })
      return
    }
    let alive = true
    fetch(getPartnerApiUrl('/partner/me'), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!alive) return
        if (data?.is_partner) {
          setState({ isPartner: true, brand: data.brand || null, loading: false })
        } else {
          setState({ isPartner: false, brand: null, loading: false })
        }
      })
      .catch(() => {
        if (alive) setState({ isPartner: false, brand: null, loading: false })
      })
    return () => { alive = false }
  }, [user?.id])

  return state
}
