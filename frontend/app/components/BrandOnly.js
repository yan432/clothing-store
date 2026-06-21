'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { getPartnerApiUrl } from '../lib/api'

export default function BrandOnly({ children, onResolved }) {
  const { loading, user } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth')
      return
    }
    let alive = true
    fetch(getPartnerApiUrl('/partner/me'), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!alive) return
        if (!data?.is_partner) {
          router.replace('/auth?error=not_a_partner')
          return
        }
        setInfo(data)
        onResolved?.(data)
        setChecking(false)
      })
      .catch(() => {
        if (alive) router.replace('/auth?error=partner_check_failed')
      })
    return () => { alive = false }
  }, [loading, user, router, onResolved])

  if (loading || !user || checking) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', color: '#888' }}>
        Checking partner access…
      </main>
    )
  }

  return typeof children === 'function' ? children(info) : children
}
