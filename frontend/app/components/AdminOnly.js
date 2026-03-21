'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

export default function AdminOnly({ children }) {
  const { loading, user, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user || !isAdmin) {
      router.replace('/auth')
    }
  }, [loading, user, isAdmin, router])

  if (loading || !user || !isAdmin) {
    return (
      <main style={{maxWidth:900,margin:'0 auto',padding:'48px 24px',color:'#888'}}>
        Checking admin access...
      </main>
    )
  }

  return children
}
