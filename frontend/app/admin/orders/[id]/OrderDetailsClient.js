'use client'
import { useEffect, useMemo, useState } from 'react'
import { getAdminApiUrl as getApiUrl } from '../../../lib/api'
import AdminOnly from '../../../components/AdminOnly'

function fmtDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2,'0')}, ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`
}

function fmtMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'eur').toUpperCase(),
  }).format(Number(value || 0))
}

const STATUS_OPTIONS = ['pending','paid','shipped','delivered','cancelled','payment_failed']

function statusStyle(s) {
  if (s === 'paid')            return { bg:'#ecfdf3', color:'#166534', border:'#bbf7d0' }
  if (s === 'shipped')         return { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' }
  if (s === 'delivered')       return { bg:'#f0fdf4', color:'#15803d', border:'#86efac' }
  if (s === 'pending')         return { bg:'#fff7ed', color:'#9a3412', border:'#fed7aa' }
  if (s === 'payment_failed')  return { bg:'#fef2f2', color:'#991b1b', border:'#fecaca' }
  if (s === 'cancelled')       return { bg:'#f3f4f6', color:'#374151', border:'#e5e7eb' }
  return { bg:'#f3f3f0', color:'#4f4f49', border:'#e9e9e4' }
}

function StatusBadge({ status }) {
  const s = statusStyle(status)
  return (
    <span style={{
      fontSize:13, fontWeight:600, padding:'5px 12px', borderRadius:999,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
    }}>{status || '-'}</span>
  )
}

function SectionCard({ title, children }) {
  return (
    <section style={{border:'1px solid #ecece8',borderRadius:12,padding:'18px 20px',background:'#fff',marginTop:16}}>
      {title && <h2 style={{fontSize:14,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 14px'}}>{title}</h2>}
      {children}
    </section>
  )
}

export default function OrderDetailsClient({ id }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  // Status
  const [statusVal, setStatusVal] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  // Tracking
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [trackingSaving, setTrackingSaving] = useState(false)
  const [trackingMsg, setTrackingMsg] = useState('')

  // Notify shipped
  const [notifying, setNotifying] = useState(false)
  const [notifyMsg, setNotifyMsg] = useState('')

  // Resend confirmation
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load(attempt = 1) {
    if (!id) return
    setLoading(true)
    setError('')
    setRetryCount(attempt - 1)
    const url = getApiUrl('/orders/' + id)
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        setError(`Server returned ${res.status}${msg ? ': ' + msg : ''}`)
        setLoading(false)
        return
      }
      const data = await res.json()
      setOrder(data)
      setStatusVal(data.status || '')
      setTrackingNumber(data.tracking_number || '')
      setTrackingUrl(data.tracking_url || '')
      setLoading(false)
    } catch {
      // Render free tier sleeps ~15-30s on first request — retry every 5s up to 7 times
      if (attempt < 7) {
        setTimeout(() => load(attempt + 1), 5000)
      } else {
        setError(`Server not responding. Make sure the backend is running.\nURL: ${url}`)
        setLoading(false)
      }
    }
  }

  useEffect(() => { load() }, [id])

  async function saveStatus() {
    setStatusSaving(true)
    setStatusMsg('')
    try {
      const res = await fetch(getApiUrl('/orders/' + id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusVal }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setOrder(updated)
      setStatusMsg('Status updated')
    } catch (e) {
      setStatusMsg('Error: ' + e.message)
    } finally {
      setStatusSaving(false)
      setTimeout(() => setStatusMsg(''), 3000)
    }
  }

  async function saveTracking() {
    setTrackingSaving(true)
    setTrackingMsg('')
    try {
      const res = await fetch(getApiUrl('/orders/' + id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_number: trackingNumber, tracking_url: trackingUrl }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setOrder(updated)
      setTrackingMsg('Tracking saved')
    } catch (e) {
      setTrackingMsg('Error: ' + e.message)
    } finally {
      setTrackingSaving(false)
      setTimeout(() => setTrackingMsg(''), 3000)
    }
  }

  async function notifyShipped() {
    setNotifying(true)
    setNotifyMsg('')
    try {
      const res = await fetch(getApiUrl('/orders/' + id + '/notify-shipped'), {
        method: 'POST',
      })
      if (!res.ok) throw new Error(await res.text())
      setNotifyMsg('Email sent to customer ✓')
      await load()
    } catch (e) {
      setNotifyMsg('Error: ' + e.message)
    } finally {
      setNotifying(false)
      setTimeout(() => setNotifyMsg(''), 5000)
    }
  }

  async function deleteOrder() {
    setDeleting(true)
    try {
      await fetch(getApiUrl('/orders/' + id), { method: 'DELETE' })
      window.location.href = '/admin/orders'
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const shippingAddress = useMemo(() => {
    if (!order) return ''
    return [
      order.shipping_line1, order.shipping_line2,
      order.shipping_city, order.shipping_state,
      order.shipping_postal_code, order.shipping_country,
    ].filter(Boolean).join(', ')
  }, [order])

  const metadata = order?.metadata_json || {}

  if (loading) return (
    <AdminOnly>
      <main style={{maxWidth:960,margin:'0 auto',padding:'48px 24px'}}>
        <p style={{color:'#888'}}>{retryCount === 0 ? 'Loading order…' : `Connecting to server… (attempt ${retryCount + 1}/7)`}</p>
        {retryCount > 0 && (
          <p style={{fontSize:12,color:'#bbb',marginTop:4}}>Server is waking up, please wait…</p>
        )}
      </main>
    </AdminOnly>
  )

  if (error) return (
    <AdminOnly>
      <main style={{maxWidth:960,margin:'0 auto',padding:'48px 24px'}}>
        <a href="/admin/orders" style={{fontSize:14,color:'#666',textDecoration:'none'}}>← Back to orders</a>
        <p style={{color:'#b91c1c',marginTop:16}}>Error: {error}</p>
        <button onClick={load} style={{marginTop:12,padding:'8px 18px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>
          Retry
        </button>
      </main>
    </AdminOnly>
  )

  if (!order) return (
    <AdminOnly>
      <main style={{maxWidth:960,margin:'0 auto',padding:'48px 24px'}}>
        <a href="/admin/orders" style={{fontSize:14,color:'#666'}}>← Back to orders</a>
        <p style={{marginTop:16,color:'#888'}}>Order not found</p>
      </main>
    </AdminOnly>
  )

  const inp = { padding:'10px 12px', borderRadius:8, border:'1px solid #e5e5e3', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', background:'#fff' }

  return (
    <AdminOnly>
      <main style={{maxWidth:960,margin:'0 auto',padding:'40px 24px 80px'}}>
        <a href="/admin/orders" style={{fontSize:14,color:'#666',textDecoration:'none'}}>← Back to orders</a>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:700,margin:'0 0 4px'}}>Order #{order.id}</h1>
            <p style={{fontSize:13,color:'#888',margin:0}}>{fmtDate(order.created_at)} · {order.email || '-'}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Two-column layout */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16,alignItems:'start',marginTop:0}}>
          {/* Left column: order info */}
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:16}}>
              <SectionCard title="Customer">
                <p style={{margin:'0 0 4px',fontSize:14}}>{order.email || '-'}</p>
                <p style={{margin:0,fontSize:13,color:'#777'}}>{order.phone || '-'}</p>
              </SectionCard>
              <SectionCard title="Shipping address">
                <p style={{margin:'0 0 4px',fontSize:14,fontWeight:500}}>{order.shipping_name || '-'}</p>
                <p style={{margin:0,fontSize:13,color:'#777'}}>{shippingAddress || '-'}</p>
              </SectionCard>
            </div>

            {/* Items */}
            <SectionCard title="Items">
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {Array.isArray(order.items_json) && order.items_json.length > 0 ? (
                  order.items_json.map((item, idx) => (
                    <div key={idx} style={{display:'flex',gap:12,alignItems:'center',borderBottom:'1px solid #f2f2ef',paddingBottom:8}}>
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} style={{width:48,height:48,objectFit:'cover',borderRadius:6,flexShrink:0,border:'1px solid #f0f0ee'}}/>
                      )}
                      <div style={{flex:1}}>
                        <p style={{margin:'0 0 2px',fontSize:14,fontWeight:500}}>{item.name || 'Item'}</p>
                        <p style={{margin:0,fontSize:12,color:'#888'}}>
                          {item.size ? `Size: ${item.size} · ` : ''}Qty: {item.quantity || 1}
                        </p>
                      </div>
                      <p style={{margin:0,fontSize:13,fontWeight:600}}>{fmtMoney(item.price * (item.quantity || 1), order.currency)}</p>
                    </div>
                  ))
                ) : (
                  <p style={{color:'#aaa',margin:0,fontSize:13}}>No items</p>
                )}
              </div>
              <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid #ecece8'}}>
                {metadata.promo_code && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#16a34a',marginBottom:4}}>
                    <span>Promo ({metadata.promo_code})</span>
                    <span>−{fmtMoney(metadata.promo_discount_amount, order.currency)}</span>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700}}>
                  <span>Total</span>
                  <span>{fmtMoney(order.amount_total, order.currency)}</span>
                </div>
              </div>
            </SectionCard>

            {/* Order note */}
            {metadata.order_note && (
              <SectionCard title="Order note">
                <p style={{margin:0,fontSize:14,color:'#555',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{metadata.order_note}</p>
              </SectionCard>
            )}

            {/* Tracking (display) */}
            {(order.tracking_number || order.tracking_url) && (
              <SectionCard title="Tracking">
                {order.tracking_number && <p style={{margin:'0 0 4px',fontSize:14}}>Number: <strong>{order.tracking_number}</strong></p>}
                {order.tracking_url && (
                  <p style={{margin:0,fontSize:14}}>
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" style={{color:'#2563eb'}}>
                      Track package →
                    </a>
                  </p>
                )}
                {order.shipped_at && <p style={{margin:'8px 0 0',fontSize:12,color:'#888'}}>Shipped: {fmtDate(order.shipped_at)}</p>}
              </SectionCard>
            )}

            {/* Timeline */}
            <SectionCard title="Timeline">
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[
                  {label:'Created',    at:order.created_at},
                  {label:'Paid',       at:order.paid_at},
                  {label:'Shipped',    at:order.shipped_at},
                  {label:'Updated',    at:order.updated_at},
                  {label:'Cancelled',  at:order.cancelled_at},
                  {label:'Pay failed', at:order.failed_at},
                ].filter(x => x.at).map(x => (
                  <div key={x.label} style={{fontSize:13}}>
                    <span style={{color:'#888',minWidth:90,display:'inline-block'}}>{x.label}:</span>
                    <span style={{color:'#333'}}> {fmtDate(x.at)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Tech */}
            <SectionCard title="Tech info">
              {[
                ['Stripe session',  order.stripe_session_id],
                ['Payment intent',  order.stripe_payment_intent_id],
                ['Client ref',      order.client_reference_id],
              ].map(([label, val]) => val ? (
                <p key={label} style={{margin:'0 0 4px',fontSize:12,color:'#555'}}>
                  {label}: <span style={{fontFamily:'monospace',color:'#333'}}>{val}</span>
                </p>
              ) : null)}
            </SectionCard>
          </div>

          {/* Right column: admin actions */}
          <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:12}}>

            {/* Change status */}
            <section style={{border:'1px solid #ecece8',borderRadius:12,padding:'16px 18px',background:'#fff'}}>
              <h2 style={{fontSize:13,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 12px'}}>Change status</h2>
              <select value={statusVal} onChange={e => setStatusVal(e.target.value)}
                style={{...inp, marginBottom:10, display:'block'}}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={saveStatus} disabled={statusSaving || statusVal === order.status}
                style={{width:'100%',background:'#111',color:'#fff',border:'none',padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:statusSaving?0.6:1}}>
                {statusSaving ? 'Saving…' : 'Save status'}
              </button>
              {statusMsg && <p style={{fontSize:12,margin:'8px 0 0',color:statusMsg.startsWith('Error')?'#b91c1c':'#16a34a'}}>{statusMsg}</p>}
            </section>

            {/* Tracking info */}
            <section style={{border:'1px solid #ecece8',borderRadius:12,padding:'16px 18px',background:'#fff'}}>
              <h2 style={{fontSize:13,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 12px'}}>Tracking info</h2>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
                <input
                  placeholder="Tracking number"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  style={inp}
                />
                <input
                  placeholder="Tracking URL (https://...)"
                  value={trackingUrl}
                  onChange={e => setTrackingUrl(e.target.value)}
                  style={inp}
                />
              </div>
              <button onClick={saveTracking} disabled={trackingSaving}
                style={{width:'100%',background:'#111',color:'#fff',border:'none',padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:trackingSaving?0.6:1}}>
                {trackingSaving ? 'Saving…' : 'Save tracking'}
              </button>
              {trackingMsg && <p style={{fontSize:12,margin:'8px 0 0',color:trackingMsg.startsWith('Error')?'#b91c1c':'#16a34a'}}>{trackingMsg}</p>}
            </section>

            {/* Notify customer */}
            <section style={{border:'1px solid #ecece8',borderRadius:12,padding:'16px 18px',background:'#fff'}}>
              <h2 style={{fontSize:13,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 8px'}}>Notify customer</h2>
              <p style={{fontSize:12,color:'#888',margin:'0 0 12px',lineHeight:1.5}}>
                Sends emails to <strong>{order.email}</strong>
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button onClick={notifyShipped} disabled={notifying}
                  style={{width:'100%',background:'#0f766e',color:'#fff',border:'none',padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:notifying?0.6:1}}>
                  {notifying ? 'Sending…' : '📦 Send shipping notification'}
                </button>
                <button onClick={async () => {
                  setResending(true); setResendMsg('')
                  try {
                    const res = await fetch(getApiUrl('/orders/' + id + '/resend-confirmation'), { method: 'POST' })
                    if (!res.ok) throw new Error((await res.text()) || 'Failed')
                    setResendMsg('Confirmation email sent ✓')
                  } catch (e) { setResendMsg('Error: ' + e.message) }
                  finally { setResending(false); setTimeout(() => setResendMsg(''), 5000) }
                }} disabled={resending}
                  style={{width:'100%',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:resending?0.6:1}}>
                  {resending ? 'Sending…' : '📧 Resend order confirmation'}
                </button>
              </div>
              {notifyMsg && <p style={{fontSize:12,margin:'8px 0 0',color:notifyMsg.startsWith('Error')?'#b91c1c':'#16a34a'}}>{notifyMsg}</p>}
              {resendMsg && <p style={{fontSize:12,margin:'4px 0 0',color:resendMsg.startsWith('Error')?'#b91c1c':'#16a34a'}}>{resendMsg}</p>}
            </section>

            {/* Delete */}
            <section style={{border:'1px solid #fecaca',borderRadius:12,padding:'16px 18px',background:'#fff'}}>
              <h2 style={{fontSize:13,fontWeight:700,color:'#991b1b',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 8px'}}>Danger zone</h2>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  style={{width:'100%',background:'#fff',color:'#b91c1c',border:'1px solid #fca5a5',padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  Delete order
                </button>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{fontSize:12,color:'#b91c1c',margin:0}}>Are you sure? This cannot be undone.</p>
                  <button onClick={deleteOrder} disabled={deleting}
                    style={{background:'#b91c1c',color:'#fff',border:'none',padding:'10px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:deleting?0.6:1}}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    style={{background:'none',color:'#555',border:'1px solid #e5e5e3',padding:'9px',borderRadius:8,fontSize:13,cursor:'pointer'}}>
                    Cancel
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </AdminOnly>
  )
}
