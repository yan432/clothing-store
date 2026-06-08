'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { getApiUrl } from '../../../lib/api'
import { normalizeLocale, pathForLocale } from '../../../lib/i18n'
import { buildItemImageAlt } from '../../../lib/seoText'
import { ThumbsUp, Package } from 'lucide-react'

const ORDER_COPY = {
  en: {
    fitQuestion: 'Did it fit?',
    fit: {
      perfect: 'Fits perfect',
      too_small: '↓ Too small',
      too_big: '↑ Too big',
    },
    loading: 'Loading order...',
    signInRequired: 'Sign in to view your order details.',
    back: 'Back to orders',
    notFound: 'Order not found',
    failedLoad: 'Failed to load order',
    order: 'Order',
    placed: 'Placed',
    trackingInfo: 'Tracking information',
    trackingNumber: 'Tracking number',
    trackPackage: 'Track your package →',
    shipped: 'Shipped',
    items: 'Items',
    item: 'Item',
    noItems: 'No items found.',
    qty: 'Qty',
    size: 'Size',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    statuses: {
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      pending: 'Processing',
      cancelled: 'Cancelled',
      unknown: 'Unknown',
    },
  },
  uk: {
    fitQuestion: 'Як сіло?',
    fit: {
      perfect: 'Сіло ідеально',
      too_small: '↓ Замале',
      too_big: '↑ Завелике',
    },
    loading: 'Завантажуємо замовлення...',
    signInRequired: 'Увійди, щоб переглянути деталі замовлення.',
    back: 'Назад до замовлень',
    notFound: 'Замовлення не знайдено',
    failedLoad: 'Не вдалося завантажити замовлення',
    order: 'Замовлення',
    placed: 'Оформлено',
    trackingInfo: 'Інформація для відстеження',
    trackingNumber: 'Номер відстеження',
    trackPackage: 'Відстежити посилку →',
    shipped: 'Відправлено',
    items: 'Товари',
    item: 'Товар',
    noItems: 'Товари не знайдено.',
    qty: 'К-сть',
    size: 'Розмір',
    subtotal: 'Сума',
    shipping: 'Доставка',
    total: 'Разом',
    statuses: {
      paid: 'Оплачено',
      shipped: 'Відправлено',
      delivered: 'Доставлено',
      pending: 'В обробці',
      cancelled: 'Скасовано',
      unknown: 'Невідомо',
    },
  },
}

function fitOptions(copy) {
  return [
    { value: 'perfect', label: copy.fit.perfect, Icon: ThumbsUp },
    { value: 'too_small', label: copy.fit.too_small, Icon: null },
    { value: 'too_big', label: copy.fit.too_big, Icon: null },
  ]
}

function ItemFitFeedback({ orderId, itemIndex, existing, copy }) {
  const [fit, setFit]     = useState(existing?.fit || null)
  const [saving, setSaving] = useState(false)

  async function submit(value) {
    setSaving(true)
    try {
      const res = await fetch(`/api/user/orders/${orderId}/fit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fit: value, item_index: itemIndex }),
      })
      if (res.ok) setFit(value)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {copy.fitQuestion}
      </p>
      {fit ? (
        <p style={{ margin: 0, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
          ✓ {fitOptions(copy).find(o => o.value === fit)?.label}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {fitOptions(copy).map(opt => (
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

function formatDate(value, locale = 'en') {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale === 'uk' ? 'uk-UA' : 'en-US')
}

function formatMoney(value, currency = 'EUR', locale = 'en') {
  return new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en-US', {
    style: 'currency',
    currency: (currency || 'eur').toUpperCase(),
  }).format(Number(value || 0))
}

export default function AccountOrderDetailsClient({ orderId, locale = 'en' }) {
  const preferredLocale = normalizeLocale(locale)
  const t = ORDER_COPY[preferredLocale]
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
          `/api/user/orders/track/${orderId}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), cache: 'no-store' }
        )
        if (!res.ok) throw new Error(t.notFound)
        const data = await res.json()
        if (mounted) setOrder(data)
      } catch (e) {
        if (mounted) setError(e.message || t.failedLoad)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadOrder()
    return () => { mounted = false }
  }, [orderId, user?.email, authLoading, t.failedLoad, t.notFound])

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
        <p style={{fontSize:15,color:'#666'}}>{t.loading}</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
        <p style={{fontSize:15,color:'#666',marginBottom:12}}>{t.signInRequired}</p>
        <Link href={pathForLocale('/account?tab=orders', preferredLocale)} style={{fontSize:14,color:'#111',textDecoration:'underline'}}>{t.back}</Link>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
        <p style={{fontSize:15,color:'#b91c1c',marginBottom:12}}>{error || t.notFound}</p>
        <Link href={pathForLocale('/account?tab=orders', preferredLocale)} style={{fontSize:14,color:'#111',textDecoration:'underline'}}>{t.back}</Link>
      </main>
    )
  }

  const items = Array.isArray(order.items_json) ? order.items_json : []

  function statusBadge(s) {
    if (s === 'paid')           return { key:'paid',       bg:'#dcfce7', color:'#166534' }
    if (s === 'shipped')        return { key:'shipped',    bg:'#dbeafe', color:'#1d4ed8' }
    if (s === 'delivered')      return { key:'delivered',  bg:'#dcfce7', color:'#15803d' }
    if (s === 'pending')        return { key:'pending', bg:'#fef3c7', color:'#92400e' }
    if (s === 'cancelled')      return { key:'cancelled',  bg:'#f3f4f6', color:'#374151' }
    return { key:'unknown', raw: s, bg:'#f3f3f0', color:'#4f4f49' }
  }
  const badge = statusBadge(order.status)

  return (
    <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
      <div style={{marginBottom:18}}>
        <Link href={pathForLocale('/account?tab=orders', preferredLocale)} style={{fontSize:14,color:'#111',textDecoration:'underline'}}>{t.back}</Link>
      </div>

      <section style={{border:'1px solid #e2e2e2',background:'#fff',padding:'24px 24px 28px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <h1 style={{fontSize:32,lineHeight:1.1,fontWeight:500,margin:0}}>
            {t.order} #{10000 + (order.id || 0)}
          </h1>
          <span style={{fontSize:13,fontWeight:600,color:badge.color,background:badge.bg,padding:'6px 12px',borderRadius:999}}>
            {badge.raw || t.statuses[badge.key] || t.statuses.unknown}
          </span>
        </div>
        <p style={{margin:'8px 0 0',fontSize:13,color:'#666'}}>{t.placed}: {formatDate(order.created_at, preferredLocale)}</p>

        {/* Tracking info */}
        {(order.tracking_number || order.tracking_url) && (
          <div style={{marginTop:16,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'14px 18px'}}>
            <p style={{margin:'0 0 6px',fontWeight:700,fontSize:14,color:'#166534',display:'flex',alignItems:'center',gap:6}}><Package size={14} strokeWidth={1.8} /> {t.trackingInfo}</p>
            {order.tracking_number && (
              <p style={{margin:'0 0 4px',fontSize:14,color:'#1a1a18'}}>
                {t.trackingNumber}: <strong>{order.tracking_number}</strong>
              </p>
            )}
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                style={{fontSize:14,color:'#2563eb',fontWeight:600}}>
                {t.trackPackage}
              </a>
            )}
            {order.shipped_at && (
              <p style={{margin:'8px 0 0',fontSize:12,color:'#888'}}>{t.shipped}: {formatDate(order.shipped_at, preferredLocale)}</p>
            )}
          </div>
        )}

        <section style={{marginTop:18,border:'1px solid #ecece8',borderRadius:12,padding:16}}>
          <h2 style={{fontSize:16,fontWeight:600,margin:'0 0 10px'}}>{t.items}</h2>
          {items.length === 0 ? (
            <p style={{fontSize:14,color:'#666',margin:0}}>{t.noItems}</p>
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
                            alt={buildItemImageAlt(item, preferredLocale)}
                            style={{width:52,height:52,objectFit:'cover',borderRadius:8,background:'#f4f4f4',border:'1px solid #efefef',flexShrink:0}}
                          />
                        ) : (
                          <div style={{width:52,height:52,borderRadius:8,background:'#f4f4f4',border:'1px solid #efefef',flexShrink:0}} />
                        )}
                        <div>
                          <p style={{margin:0,fontSize:14,fontWeight:500}}>{item.name || t.item}</p>
                          <p style={{margin:'4px 0 0',fontSize:12,color:'#666'}}>
                            {t.qty}: {Math.max(1, Number(item.quantity || 1))}
                            {item.size ? ` • ${t.size}: ${item.size}` : ''}
                          </p>
                          {/* Per-item size fit feedback — only for delivered orders */}
                          {order.status === 'delivered' && item.size && (
                            <ItemFitFeedback
                              orderId={order.id}
                              itemIndex={index}
                              existing={itemFeedback}
                              copy={t}
                            />
                          )}
                        </div>
                      </div>
                      <p style={{margin:0,fontSize:14,fontWeight:600,flexShrink:0}}>
                        {formatMoney(Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), order.currency || 'EUR', preferredLocale)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid #ecece8',display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#444'}}>
              <span>{t.subtotal}</span>
              <span>{formatMoney(subtotalAmount, order.currency || 'EUR', preferredLocale)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#444'}}>
              <span>{t.shipping}</span>
              <span>{formatMoney(shippingCost, order.currency || 'EUR', preferredLocale)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:700,color:'#111'}}>
              <span>{t.total}</span>
              <span>{formatMoney(order.amount_total, order.currency || 'EUR', preferredLocale)}</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
