'use client'
import { useEffect, useState } from 'react'
import { getPartnerApiUrl } from '../../lib/api'
import PageHeader from '../../admin/_components/PageHeader'
import Card from '../../admin/_components/Card'
import Badge from '../../admin/_components/Badge'
import { tokens } from '../../admin/_components/tokens'

const STATUS_TONES = {
  paid: 'success',
  shipped: 'info',
  delivered: 'success',
  pending: 'warn',
  refunded: 'danger',
  cancelled: 'danger',
}

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(amount, currency) {
  const n = Number(amount || 0)
  const cur = (currency || 'eur').toUpperCase()
  if (cur === 'EUR') return `€${n.toFixed(2)}`
  if (cur === 'UAH') return `${Math.round(n)} ₴`
  return `${n.toFixed(2)} ${cur}`
}

export default function PartnerOrdersClient() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetch(getPartnerApiUrl('/partner/orders'), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (alive) setOrders(Array.isArray(d) ? d : []) })
      .catch(e => { if (alive) { setError(String(e)); setOrders([]) } })
    return () => { alive = false }
  }, [])

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Orders containing your brand's products. Only your line items are shown."
      />
      {error && (
        <div style={{ background: tokens.color.dangerBg, border: `1px solid ${tokens.color.dangerBorder}`, color: tokens.color.dangerText, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}
      {orders === null && (
        <Card><div style={{ color: tokens.color.textSubtle, fontSize: 13 }}>Loading…</div></Card>
      )}
      {orders && orders.length === 0 && (
        <Card><div style={{ color: tokens.color.textSubtle, fontSize: 14 }}>No orders for your brand yet.</div></Card>
      )}
      {orders && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.lg }}>
          {orders.map(o => (
            <Card key={o.id} padding={tokens.space.lg}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: tokens.space.lg, marginBottom: tokens.space.md }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: tokens.color.text, marginBottom: 4 }}>
                    Order #{10000 + Number(o.id || 0)}
                  </div>
                  <div style={{ ...tokens.font.bodyMuted, fontSize: 12 }}>
                    {fmtDate(o.created_at)} · {o.customer_name || o.customer_email || 'unknown'}
                    {o.shipping_city || o.shipping_country ? ` · ${[o.shipping_city, o.shipping_country].filter(Boolean).join(', ')}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <Badge tone={STATUS_TONES[o.status] || 'neutral'}>{o.status || '—'}</Badge>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtMoney(o.my_subtotal, o.currency)}</div>
                </div>
              </div>

              {o.tracking_number && (
                <div style={{ ...tokens.font.bodyMuted, fontSize: 12, marginBottom: tokens.space.md }}>
                  Tracking: <span style={{ fontFamily: 'ui-monospace,monospace', color: tokens.color.text }}>{o.tracking_number}</span>
                  {o.carrier ? ` · ${o.carrier}` : ''}
                </div>
              )}

              <div style={{ borderTop: `1px solid ${tokens.color.border}`, paddingTop: tokens.space.md }}>
                {o.my_items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: tokens.space.md, padding: '8px 0', borderBottom: idx < o.my_items.length - 1 ? `1px solid ${tokens.color.border}` : 'none' }}>
                    <div style={{ width: 40, height: 50, background: tokens.color.bg, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      {it.image_url ? <img src={it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: tokens.color.text }}>{it.name}</div>
                      <div style={{ ...tokens.font.bodyMuted, fontSize: 12 }}>
                        Qty {it.quantity}{it.size ? ` · size ${it.size}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tokens.color.text }}>
                      {fmtMoney(Number(it.price || 0) * Number(it.quantity || 0), o.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
