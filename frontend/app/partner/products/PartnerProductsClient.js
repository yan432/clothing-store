'use client'
import { useEffect, useState } from 'react'
import { getPartnerApiUrl } from '../../lib/api'
import PageHeader from '../../admin/_components/PageHeader'
import Card from '../../admin/_components/Card'
import Badge from '../../admin/_components/Badge'
import { tokens } from '../../admin/_components/tokens'

export default function PartnerProductsClient() {
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetch(getPartnerApiUrl('/partner/products'), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (alive) setProducts(Array.isArray(d) ? d : []) })
      .catch(e => { if (alive) { setError(String(e)); setProducts([]) } })
    return () => { alive = false }
  }, [])

  return (
    <>
      <PageHeader
        title="My products"
        subtitle="Read-only view. Edits and new products are managed by the store team."
      />
      {error && (
        <div style={{ background: tokens.color.dangerBg, border: `1px solid ${tokens.color.dangerBorder}`, color: tokens.color.dangerText, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}
      <Card padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: tokens.color.bg, borderBottom: `1px solid ${tokens.color.border}` }}>
              <th style={{ padding: '12px 16px', ...tokens.font.label }}>Product</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label }}>Category</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label, textAlign: 'right' }}>Price</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label, textAlign: 'right' }}>Stock</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products === null && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: tokens.color.textSubtle, fontSize: 13 }}>Loading…</td></tr>
            )}
            {products && products.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: tokens.color.textSubtle, fontSize: 14 }}>No products assigned to your brand yet.</td></tr>
            )}
            {products && products.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${tokens.color.border}` }}>
                <td style={{ padding: '14px 16px', fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 46, borderRadius: 6, background: tokens.color.bg, overflow: 'hidden', flexShrink: 0 }}>
                      {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                    <span>{p.name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: tokens.color.textMuted }}>{p.category || '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, textAlign: 'right' }}>€{Number(p.price || 0).toFixed(2)}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'right', color: tokens.color.textMuted }}>{p.available_stock ?? p.stock ?? 0}</td>
                <td style={{ padding: '14px 16px' }}>
                  <Badge tone={p.is_hidden ? 'warn' : 'success'}>{p.is_hidden ? 'Hidden' : 'Visible'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
