'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { getApiUrl } from '../../../lib/api'
import { ThumbsUp, Package } from 'lucide-react'

const FIT_OPTIONS = [
  { value: 'perfect',   label: 'Fits perfect',  Icon: ThumbsUp },
  { value: 'too_small', label: '↓ Too small',   Icon: null },
  { value: 'too_big',   label: '↑ Too big',     Icon: null },
]

function ItemFitFeedback({ orderId, itemIndex, userEmail, existing }) {
  const [fit, setFit]     = useState(existing?.fit || null)
  const [saving, setSaving] = useState(false)

  async function submit(value) {
    setSaving(true)
    try {
      const res = await fetch(getApiUrl(`/orders/${orderId}/fit-feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fit: value, email: userEmail, item_index: itemIndex }),
      })
      if (res.ok) setFit(value)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Did it fit?
      </p>
      {fit ? (
        <p style={{ margin: 0, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
          ✓ {FIT_OPTIONS.find(o => o.value === fit)?.label}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FIT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => submit(opt.value)} disabled={saving}
              style={{
                border: '1px solid #e0e0e0', borderRadius: 6,
                padding: '4px 10px', fontSize: 12,
                background: '#fff', cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              {opt.Icon && <opt.Icon size={11} strokeWidth={2} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'eur').toUpperCase(),
  }).format(Number(value || 0))
}

export default function AccountOrderDetailsClient({ orderId }) {
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) return
    if (authLoading) return
    if (!user?.email) return

    let mounted = true
    async function loadOrder() {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(
          getApiUrl(`/orders/track/${orderId}`),
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }), cache: 'no-store' }
        )
        if (!res.ok) throw new Error('Order not found')
        const data = await res.json()
        if (mounted) setOrder(data)
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load order')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadOrder()
    return () => { mounted = false }
  }, [orderId, user?.email, authLoading])

  const shippingCost = useMemo(() => {
    if (!order) return 0
    const orderItems = Array.isArray(order.items_json) ? order.items_json : []
    const subtotal = orderItems.reduce((sum, item) => {
      const qty = Math.max(1, Number(item?.quantity || 1))
      const price = Number(item?.price || 0)
      return sum + (price * qty)
    }, 0)
    const promoDiscount = Number(order?.metadata_json?.promo_discount_amount || 0)
    const total = Number(order.amount_total || 0)
    return Math.max(0, total - subtotal + promoDiscount)
  }, [order])
  const subtotalAmount = useMemo(() => {
    if (!order) return 0
    const orderItems = Array.isArray(order.items_json) ? order.items_json : []
    return orderItems.reduce((sum, item) => {
      const qty = Math.max(1, Number(item?.quantity || 1))
      const price = Number(item?.price || 0)
      return sum + (price * qty)
    }, 0)
  }, [order])

  if (authLoading || loading) {
    return (
      <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
        <p style={{fontSize:15,color:'#666'}}>Loading order...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
        <p style={{fontSize:15,color:'#666',marginBottom:12}}>Sign in to view your order details.</p>
        <Link href="/account?tab=orders" style={{fontSize:14,color:'#111',textDecoration:'underline'}}>Back to orders</Link>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
        <p style={{fontSize:15,color:'#b91c1c',marginBottom:12}}>{error || 'Order not found'}</p>
        <Link href="/account?tab=orders" style={{fontSize:14,color:'#111',textDecoration:'underline'}}>Back to orders</Link>
      </main>
    )
  }

  const items = Array.isArray(order.items_json) ? order.items_json : []

  function statusBadge(s) {
    if (s === 'paid')           return { label:'Paid',       bg:'#dcfce7', color:'#166534' }
    if (s === 'shipped')        return { label:'Shipped',    bg:'#dbeafe', color:'#1d4ed8' }
    if (s === 'delivered')      return { label:'Delivered',  bg:'#dcfce7', color:'#15803d' }
    if (s === 'pending')        return { label:'Processing', bg:'#fef3c7', color:'#92400e' }
    if (s === 'cancelled')      return { label:'Cancelled',  bg:'#f3f4f6', color:'#374151' }
    return { label: s || 'Unknown', bg:'#f3f3f0', color:'#4f4f49' }
  }
  const badge = statusBadge(order.status)

  return (
    <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
      <div style={{marginBottom:18}}>
        <Link href="/account?tab=orders" style={{fontSize:14,color:'#111',textDecoration:'underline'}}>Back to orders</Link>
      </div>

      <section style={{border:'1px solid #e2e2e2',background:'#fff',padding:'24px 24px 28px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <h1 style={{fontSize:32,lineHeight:1.1,fontWeight:500,margin:0}}>
            Order #{10000 + (order.id || 0)}
          </h1>
          <span style={{fontSize:13,fontWeight:600,color:badge.color,background:badge.bg,padding:'6px 12px',borderRadius:999}}>
            {badge.label}
          </span>
        </div>
        <p style={{margin:'8px 0 0',fontSize:13,color:'#666'}}>Placed: {formatDate(order.created_at)}</p>

        {/* Tracking info */}
        {(order.tracking_number || order.tracking_url) && (
          <div style={{marginTop:16,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'14px 18px'}}>
            <p style={{margin:'0 0 6px',fontWeight:700,fontSize:14,color:'#166534',display:'flex',alignItems:'center',gap:6}}><Package size={14} strokeWidth={1.8} /> Tracking information</p>
            {order.tracking_number && (
              <p style={{margin:'0 0 4px',fontSize:14,color:'#1a1a18'}}>
                Tracking number: <strong>{order.tracking_number}</strong>
              </p>
            )}
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                style={{fontSize:14,color:'#2563eb',fontWeight:600}}>
                Track your package →
              </a>
            )}
            {order.shipped_at && (
              <p style={{margin:'8px 0 0',fontSize:12,color:'#888'}}>Shipped: {formatDate(order.shipped_at)}</p>
            )}
          </div>
        )}

        <section style={{marginTop:18,border:'1px solid #ecece8',borderRadius:12,padding:16}}>
          <h2 style={{fontSize:16,fontWeight:600,margin:'0 0 10px'}}>Items</h2>
          {items.length === 0 ? (
            <p style={{fontSize:14,color:'#666',margin:0}}>No items found.</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {items.map((item, index) => {
                const itemFeedback = (order.metadata_json?.item_fit_feedback || {})[String(index)]
                return (
                  <div key={`${item.id || 'item'}-${index}`} style={{borderBottom:'1px solid #f1f1ee',paddingBottom:12,marginBottom:4}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:12}}>
                      <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name || 'Item'}
                            style={{width:52,height:52,objectFit:'cover',borderRadius:8,background:'#f4f4f4',border:'1px solid #efefef',flexShrink:0}}
                          />
                        ) : (
                          <div style={{width:52,height:52,borderRadius:8,background:'#f4f4f4',border:'1px solid #efefef',flexShrink:0}} />
                        )}
                        <div>
                          <p style={{margin:0,fontSize:14,fontWeight:500}}>{item.name || 'Item'}</p>
                          <p style={{margin:'4px 0 0',fontSize:12,color:'#666'}}>
                            Qty: {Math.max(1, Number(item.quantity || 1))}
                            {item.size ? ` • Size: ${item.size}` : ''}
                          </p>
                          {/* Per-item size fit feedback — only for delivered orders */}
                          {order.status === 'delivered' && item.size && (
                            <ItemFitFeedback
                              orderId={order.id}
                              itemIndex={index}
                              userEmail={user.email}
                              existing={itemFeedback}
                            />
                          )}
                        </div>
                      </div>
                      <p style={{margin:0,fontSize:14,fontWeight:600,flexShrink:0}}>
                        {formatMoney(Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), order.currency || 'EUR')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid #ecece8',display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#444'}}>
              <span>Subtotal</span>
              <span>{formatMoney(subtotalAmount, order.currency || 'EUR')}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#444'}}>
              <span>Shipping</span>
              <span>{formatMoney(shippingCost, order.currency || 'EUR')}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:700,color:'#111'}}>
              <span>Total</span>
              <span>{formatMoney(order.amount_total, order.currency || 'EUR')}</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
