'use client'
import { useEffect, useMemo, useState } from 'react'
import { getPartnerApiUrl } from '../../lib/api'
import PageHeader from '../../admin/_components/PageHeader'
import Card from '../../admin/_components/Card'
import Badge from '../../admin/_components/Badge'
import { tokens } from '../../admin/_components/tokens'

const STD_SIZES = ['XS', 'S', 'M', 'L', 'XL']

function stockTone(qty) {
  const n = Number(qty || 0)
  if (n <= 0) return 'danger'
  if (n <= 3) return 'warn'
  return 'success'
}

export default function PartnerInventoryClient() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetch(getPartnerApiUrl('/partner/inventory'), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (alive) setRows(Array.isArray(d) ? d : []) })
      .catch(e => { if (alive) { setError(String(e)); setRows([]) } })
    return () => { alive = false }
  }, [])

  const sizeColumns = useMemo(() => {
    if (!rows) return STD_SIZES
    const seen = new Set()
    for (const r of rows) {
      for (const s of Object.keys(r.size_stock || {})) seen.add(s)
    }
    const std = STD_SIZES.filter(s => seen.has(s))
    const extra = [...seen].filter(s => !STD_SIZES.includes(s)).sort()
    return [...std, ...extra]
  }, [rows])

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Per-size stock for your brand. Read-only — the store team updates levels in the main admin."
      />
      {error && (
        <div style={{ background: tokens.color.dangerBg, border: `1px solid ${tokens.color.dangerBorder}`, color: tokens.color.dangerText, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}
      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: tokens.color.bg, borderBottom: `1px solid ${tokens.color.border}` }}>
                <th style={{ padding: '12px 16px', ...tokens.font.label }}>Product</th>
                {sizeColumns.map(s => (
                  <th key={s} style={{ padding: '12px 10px', ...tokens.font.label, textAlign: 'center' }}>{s}</th>
                ))}
                <th style={{ padding: '12px 16px', ...tokens.font.label, textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px 16px', ...tokens.font.label }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr><td colSpan={sizeColumns.length + 3} style={{ padding: 20, textAlign: 'center', color: tokens.color.textSubtle, fontSize: 13 }}>Loading…</td></tr>
              )}
              {rows && rows.length === 0 && (
                <tr><td colSpan={sizeColumns.length + 3} style={{ padding: 24, textAlign: 'center', color: tokens.color.textSubtle, fontSize: 14 }}>No products assigned to your brand yet.</td></tr>
              )}
              {rows && rows.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${tokens.color.border}` }}>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 46, borderRadius: 6, background: tokens.color.bg, overflow: 'hidden', flexShrink: 0 }}>
                        {r.image_url ? <img src={r.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                      </div>
                      <span>{r.name}</span>
                    </div>
                  </td>
                  {sizeColumns.map(s => {
                    const qty = r.size_stock?.[s]
                    return (
                      <td key={s} style={{ padding: '12px 10px', fontSize: 13, textAlign: 'center', color: qty == null ? tokens.color.textSubtle : (Number(qty) <= 0 ? tokens.color.dangerText : tokens.color.text) }}>
                        {qty == null ? '—' : qty}
                      </td>
                    )
                  })}
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{r.available_stock}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.is_hidden
                      ? <Badge tone="warn">Hidden</Badge>
                      : <Badge tone={stockTone(r.available_stock)}>{Number(r.available_stock) <= 0 ? 'Out of stock' : Number(r.available_stock) <= 3 ? 'Low' : 'In stock'}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
