'use client'
import { useEffect, useMemo, useState } from 'react'
import { getApiUrl } from '../../../lib/api'
import AdminOnly from '../../../components/AdminOnly'

function fmtDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}, ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
}

function fmtMoney(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format(Number(value || 0))
}

function timeline(order) {
  return [
    { key: 'created', label: 'Created', at: order.created_at },
    { key: 'paid', label: 'Paid', at: order.paid_at },
    { key: 'failed', label: 'Payment failed', at: order.failed_at },
    { key: 'cancelled', label: 'Cancelled', at: order.cancelled_at },
    { key: 'updated', label: 'Updated', at: order.updated_at },
  ].filter((x) => x.at)
}

export default function OrderDetailsClient({ id }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      try {
        setLoading(true)
        const res = await fetch(getApiUrl('/orders/' + id), { cache: 'no-store' })
        if (!res.ok) {
          if (mounted) setOrder(null)
          return
        }
        const data = await res.json()
        if (mounted) setOrder(data)
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load order')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const shippingAddress = useMemo(() => {
    if (!order) return ''
    return [
      order.shipping_line1,
      order.shipping_line2,
      order.shipping_city,
      order.shipping_state,
      order.shipping_postal_code,
      order.shipping_country,
    ].filter(Boolean).join(', ')
  }, [order])

  if (loading) {
    return (
      <AdminOnly>
        <main style={{maxWidth:960,margin:'0 auto',padding:'48px 24px',color:'#888'}}>Loading order...</main>
      </AdminOnly>
    )
  }

  if (error) {
    return (
      <AdminOnly>
        <main style={{maxWidth:960,margin:'0 auto',padding:'48px 24px',color:'#b91c1c'}}>Error: {error}</main>
      </AdminOnly>
    )
  }

  if (!order) {
    return (
      <AdminOnly>
        <main style={{maxWidth:960,margin:'0 auto',padding:'48px 24px'}}>
          <a href="/admin/orders" style={{fontSize:14,color:'#666'}}>← Back to orders</a>
          <p style={{marginTop:16,color:'#888'}}>Order not found</p>
        </main>
      </AdminOnly>
    )
  }

  return (
    <AdminOnly>
      <main style={{maxWidth:960,margin:'0 auto',padding:'40px 24px 72px'}}>
        <a href="/admin/orders" style={{fontSize:14,color:'#666',textDecoration:'none'}}>← Back to orders</a>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginTop:14}}>
          <h1 style={{fontSize:30,fontWeight:600,margin:0}}>Order #{order.id}</h1>
          <span style={{fontSize:13,color:'#666'}}>{order.status}</span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:22}}>
          <section style={{border:'1px solid #ecece8',borderRadius:12,padding:16,background:'#fff'}}>
            <h2 style={{fontSize:16,margin:'0 0 12px'}}>Customer</h2>
            <p style={{margin:'0 0 6px'}}>{order.email || '-'}</p>
            <p style={{margin:0,color:'#777'}}>{order.phone || '-'}</p>
          </section>

          <section style={{border:'1px solid #ecece8',borderRadius:12,padding:16,background:'#fff'}}>
            <h2 style={{fontSize:16,margin:'0 0 12px'}}>Shipping</h2>
            <p style={{margin:'0 0 6px'}}>{order.shipping_name || '-'}</p>
            <p style={{margin:0,color:'#777'}}>{shippingAddress || '-'}</p>
          </section>
        </div>

        <section style={{border:'1px solid #ecece8',borderRadius:12,padding:16,background:'#fff',marginTop:16}}>
          <h2 style={{fontSize:16,margin:'0 0 10px'}}>Items</h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {Array.isArray(order.items_json) && order.items_json.length > 0 ? (
              order.items_json.map((item, idx) => (
                <div key={idx} style={{display:'flex',justifyContent:'space-between',fontSize:14,borderBottom:'1px solid #f2f2ef',paddingBottom:8}}>
                  <div>
                    <div>{item.name || 'Item'}</div>
                    <div style={{fontSize:12,color:'#777'}}>Size: {item.size || '-'} · Qty: {item.quantity || 1}</div>
                  </div>
                  <div>{fmtMoney(item.price, order.currency)}</div>
                </div>
              ))
            ) : (
              <p style={{color:'#888',margin:0}}>No items</p>
            )}
          </div>
          <p style={{marginTop:12,fontWeight:600}}>Total: {fmtMoney(order.amount_total, order.currency)}</p>
        </section>

        <section style={{border:'1px solid #ecece8',borderRadius:12,padding:16,background:'#fff',marginTop:16}}>
          <h2 style={{fontSize:16,margin:'0 0 10px'}}>Timeline</h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {timeline(order).map((entry) => (
              <div key={entry.key} style={{fontSize:14}}>
                <strong>{entry.label}:</strong> {fmtDate(entry.at)}
              </div>
            ))}
          </div>
        </section>

        <section style={{border:'1px solid #ecece8',borderRadius:12,padding:16,background:'#fff',marginTop:16}}>
          <h2 style={{fontSize:16,margin:'0 0 10px'}}>Tech</h2>
          <p style={{margin:'0 0 6px',fontSize:13,color:'#555'}}>Client ref: <span style={{fontFamily:'monospace'}}>{order.client_reference_id || '-'}</span></p>
          <p style={{margin:'0 0 6px',fontSize:13,color:'#555'}}>Stripe session: <span style={{fontFamily:'monospace'}}>{order.stripe_session_id || '-'}</span></p>
          <p style={{margin:0,fontSize:13,color:'#555'}}>Payment intent: <span style={{fontFamily:'monospace'}}>{order.stripe_payment_intent_id || '-'}</span></p>
        </section>
      </main>
    </AdminOnly>
  )
}
