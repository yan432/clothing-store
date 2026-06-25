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
      <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color: tokens.color.text }}>
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
        <div style={{ fontSize: 13, fontWeight: 900, color: tokens.color.text, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      safeFetch(getApiUrl('/orders')),
      safeFetch(getApiUrl('/products/admin')),
      safeFetch(getApiUrl('/subscribers')),
      safeFetch(getApiUrl('/admin/stats/views?period_days=7&limit=5')),
    ]).then(([o, p, s, st]) => {
      if (!alive) return
      setOrders(Array.isArray(o) ? o : [])
      setProducts(Array.isArray(p) ? p : [])
      setSubscribers(Array.isArray(s) ? s : [])
      setStats(st && typeof st === 'object' ? st : null)
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

      <section style={{ marginBottom: tokens.space.xxl }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: tokens.space.md }}>
          <div style={tokens.font.label}>Top brands · 7d</div>
          <Link href="/admin/brands" style={{ fontSize: 12, color: tokens.color.textMuted, textDecoration: 'none' }}>Manage brands →</Link>
        </div>
        <Card padding={0}>
          {(!stats || !stats.top_brands || stats.top_brands.length === 0) ? (
            <div style={{ padding: 20, color: tokens.color.textSubtle, fontSize: 13 }}>
              {loading ? 'Loading…' : 'No views yet. Brand views start counting once tracking fires on storefront.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: tokens.color.bg, borderBottom: `1px solid ${tokens.color.border}` }}>
                  <th style={{ padding: '10px 16px', ...tokens.font.label }}>Brand</th>
                  <th style={{ padding: '10px 16px', ...tokens.font.label, textAlign: 'right' }}>Direct</th>
                  <th style={{ padding: '10px 16px', ...tokens.font.label, textAlign: 'right' }}>Via products</th>
                  <th style={{ padding: '10px 16px', ...tokens.font.label, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_brands.map(b => (
                  <tr key={b.brand_id} style={{ borderBottom: `1px solid ${tokens.color.border}` }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: tokens.color.bg, overflow: 'hidden', flexShrink: 0 }}>
                          {b.logo_url ? <img src={b.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'right', color: tokens.color.textMuted }}>{b.direct_page_views}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'right', color: tokens.color.textMuted }}>{b.product_views}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>{b.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section style={{ marginBottom: tokens.space.xxl }}>
        <div style={{ ...tokens.font.label, marginBottom: tokens.space.md }}>Top products · 7d</div>
        <Card padding={0}>
          {(!stats || !stats.top_products || stats.top_products.length === 0) ? (
            <div style={{ padding: 20, color: tokens.color.textSubtle, fontSize: 13 }}>
              {loading ? 'Loading…' : 'No product views yet.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: tokens.color.bg, borderBottom: `1px solid ${tokens.color.border}` }}>
                  <th style={{ padding: '10px 16px', ...tokens.font.label }}>Product</th>
                  <th style={{ padding: '10px 16px', ...tokens.font.label, textAlign: 'right' }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_products.map(p => (
                  <tr key={p.product_id} style={{ borderBottom: `1px solid ${tokens.color.border}` }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 40, borderRadius: 6, background: tokens.color.bg, overflow: 'hidden', flexShrink: 0 }}>
                          {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                        <Link href={`/admin/products/${p.product_id}`} style={{ color: tokens.color.text, textDecoration: 'none' }}>{p.name}</Link>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>{p.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
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
