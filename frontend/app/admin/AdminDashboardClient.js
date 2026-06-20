'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAdminApiUrl as getApiUrl } from '../lib/api'
import PageHeader from './_components/PageHeader'
import Card from './_components/Card'
import { tokens } from './_components/tokens'

async function safeFetch(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function StatTile({ label, value, hint }) {
  return (
    <Card style={{ minWidth: 0 }}>
      <div style={{ ...tokens.font.label, marginBottom: tokens.space.sm }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1, color: tokens.color.text }}>
        {value ?? '—'}
      </div>
      {hint && (
        <div style={{ ...tokens.font.bodyMuted, marginTop: tokens.space.xs }}>{hint}</div>
      )}
    </Card>
  )
}

function ShortcutTile({ href, title, description }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card style={{ height: '100%' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: tokens.color.text, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ ...tokens.font.bodyMuted }}>{description}</div>
      </Card>
    </Link>
  )
}

export default function AdminDashboardClient() {
  const [orders, setOrders] = useState(null)
  const [products, setProducts] = useState(null)
  const [subscribers, setSubscribers] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      safeFetch(getApiUrl('/orders')),
      safeFetch(getApiUrl('/products/admin')),
      safeFetch(getApiUrl('/subscribers')),
    ]).then(([o, p, s]) => {
      if (!alive) return
      setOrders(Array.isArray(o) ? o : [])
      setProducts(Array.isArray(p) ? p : [])
      setSubscribers(Array.isArray(s) ? s : [])
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const ordersToday = orders?.filter((o) => {
    const created = o.created_at || o.createdAt
    if (!created) return false
    return new Date(created) >= today
  }).length

  const hiddenProducts = products?.filter((p) => p.is_hidden).length
  const archivedProducts = products?.filter((p) => (
    String(p.name || '').startsWith('[ARCHIVED]') ||
    String(p.category || '').toLowerCase() === 'archived'
  )).length

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Quick overview of store activity." />

      <section style={{ marginBottom: tokens.space.xxl }}>
        <div style={{ ...tokens.font.label, marginBottom: tokens.space.md }}>At a glance</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: tokens.space.lg,
        }}>
          <StatTile label="Orders today" value={loading ? '…' : ordersToday} hint={loading ? null : `${orders.length} total`} />
          <StatTile label="Products" value={loading ? '…' : products.length} hint={loading ? null : `${hiddenProducts} hidden · ${archivedProducts} archived`} />
          <StatTile label="Subscribers" value={loading ? '…' : subscribers.length} />
        </div>
      </section>

      <section>
        <div style={{ ...tokens.font.label, marginBottom: tokens.space.md }}>Shortcuts</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: tokens.space.lg,
        }}>
          <ShortcutTile href="/admin/orders" title="Orders" description="Recent orders and statuses." />
          <ShortcutTile href="/admin/products/new" title="Add product" description="Create a new catalog item." />
          <ShortcutTile href="/admin/inventory" title="Inventory" description="Stock levels per variant." />
          <ShortcutTile href="/admin/homepage" title="Homepage" description="Slides and Instagram blocks." />
          <ShortcutTile href="/admin/promos" title="Promo codes" description="Discounts and campaigns." />
          <ShortcutTile href="/admin/settings" title="Settings" description="SEO, emails, announcement bar." />
        </div>
      </section>
    </>
  )
}
