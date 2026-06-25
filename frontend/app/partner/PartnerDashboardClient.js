'use client'
import { useEffect, useState } from 'react'
import { getPartnerApiUrl } from '../lib/api'
import PageHeader from '../admin/_components/PageHeader'
import Card from '../admin/_components/Card'
import { tokens } from '../admin/_components/tokens'

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
      {hint && <div style={{ ...tokens.font.bodyMuted, marginTop: tokens.space.xs }}>{hint}</div>}
    </Card>
  )
}

export default function PartnerDashboardClient() {
  const [me, setMe] = useState(null)
  const [products, setProducts] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      safeFetch(getPartnerApiUrl('/partner/me')),
      safeFetch(getPartnerApiUrl('/partner/products')),
      safeFetch(getPartnerApiUrl('/partner/stats/views?period_days=7')),
    ]).then(([m, p, s]) => {
      if (!alive) return
      setMe(m)
      setProducts(Array.isArray(p) ? p : [])
      setStats(s)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const brandName = me?.brand?.name || 'your brand'
  const visibleCount = products?.filter(p => !p.is_hidden).length

  return (
    <>
      <PageHeader title={`Welcome, ${brandName}`} subtitle="Read-only view of your catalog and traffic." />

      <section style={{ marginBottom: tokens.space.xxl }}>
        <div style={{ ...tokens.font.label, marginBottom: tokens.space.md }}>At a glance · 7d</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: tokens.space.lg }}>
          <StatTile label="Products" value={loading ? '…' : products.length} hint={loading ? null : `${visibleCount} visible`} />
          <StatTile label="Brand page views" value={loading ? '…' : (stats?.brand_views ?? 0)} hint="Direct visits to your brand page" />
          <StatTile label="Product views" value={loading ? '…' : (stats?.product_views_total ?? 0)} hint="Across all your products" />
        </div>
      </section>

      <section>
        <div style={{ ...tokens.font.label, marginBottom: tokens.space.md }}>Top products · 7d</div>
        <Card padding={0}>
          {(!stats || !stats.top_products || stats.top_products.length === 0) ? (
            <div style={{ padding: 20, color: tokens.color.textSubtle, fontSize: 13 }}>
              {loading ? 'Loading…' : 'No product views yet in the last 7 days.'}
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
                        <span>{p.name}</span>
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
    </>
  )
}
