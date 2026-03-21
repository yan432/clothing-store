'use client'
import { useMemo, useState } from 'react'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getUTCMonth()]
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${month} ${day}, ${year}, ${hours}:${minutes} UTC`
}

function formatMoney(value, currency = 'USD') {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format(amount)
}

function formatOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'No items'
  return items
    .map((item) => {
      const name = item?.name || 'Item'
      const qty = item?.quantity || 1
      const size = item?.size ? `, ${item.size}` : ''
      return `${name} x${qty}${size}`
    })
    .join(' | ')
}

function formatShipping(order) {
  const parts = [
    order.shipping_line1,
    order.shipping_line2,
    order.shipping_city,
    order.shipping_state,
    order.shipping_postal_code,
    order.shipping_country,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '-'
}

function statusStyle(status) {
  if (status === 'paid') return { bg: '#ecfdf3', color: '#166534', border: '#bbf7d0' }
  if (status === 'pending') return { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' }
  if (status === 'payment_failed') return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
  if (status === 'cancelled') return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
  return { bg: '#f3f3f0', color: '#4f4f49', border: '#e9e9e4' }
}

export default function OrdersTable({ orders }) {
  const [openOrderId, setOpenOrderId] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function toggleOrder(orderId) {
    setOpenOrderId((current) => (current === orderId ? null : orderId))
  }

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase()
    const fromTs = dateFrom ? Date.parse(`${dateFrom}T00:00:00Z`) : null
    const toTs = dateTo ? Date.parse(`${dateTo}T23:59:59Z`) : null

    return orders.filter((order) => {
      if (status !== 'all' && order.status !== status) return false

      const createdTs = order.created_at ? Date.parse(order.created_at) : null
      if (fromTs && (!createdTs || createdTs < fromTs)) return false
      if (toTs && (!createdTs || createdTs > toTs)) return false

      if (!q) return true
      const haystack = [
        String(order.id || ''),
        order.client_reference_id || '',
        order.stripe_session_id || '',
        order.email || '',
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [orders, query, status, dateFrom, dateTo])

  function exportCsv() {
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const header = [
      'id',
      'created_at',
      'status',
      'email',
      'phone',
      'amount_total',
      'currency',
      'client_reference_id',
      'stripe_session_id',
      'shipping_name',
      'shipping_address',
      'items',
    ]
    const rows = filteredOrders.map((order) => [
      order.id,
      order.created_at,
      order.status,
      order.email,
      order.phone,
      order.amount_total,
      order.currency,
      order.client_reference_id,
      order.stripe_session_id,
      order.shipping_name,
      formatShipping(order),
      formatOrderItems(order.items_json),
    ])
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',marginBottom:14}}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search email / order id / session"
          style={{minWidth:260,flex:'1 1 260px',border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="payment_failed">Payment failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={{border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={{border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
        />
        <button
          onClick={exportCsv}
          style={{background:'#111',color:'#fff',border:'none',borderRadius:10,padding:'10px 14px',fontSize:14,cursor:'pointer'}}>
          Export CSV
        </button>
      </div>

      <p style={{fontSize:13,color:'#7d7d76',margin:'0 0 10px'}}>
        Showing {filteredOrders.length} of {orders.length} orders
      </p>

      <div style={{overflowX:'auto',border:'1px solid #ecece8',borderRadius:14,background:'#fff'}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:980}}>
        <thead>
          <tr style={{textAlign:'left',borderBottom:'1px solid #ecece8',background:'#fafaf8'}}>
            <th style={{padding:'12px 14px',fontSize:12,color:'#666660',fontWeight:600}}>Created</th>
            <th style={{padding:'12px 14px',fontSize:12,color:'#666660',fontWeight:600}}>Order</th>
            <th style={{padding:'12px 14px',fontSize:12,color:'#666660',fontWeight:600}}>Status</th>
            <th style={{padding:'12px 14px',fontSize:12,color:'#666660',fontWeight:600}}>Customer</th>
            <th style={{padding:'12px 14px',fontSize:12,color:'#666660',fontWeight:600}}>Amount</th>
            <th style={{padding:'12px 14px',fontSize:12,color:'#666660',fontWeight:600}}>Shipping</th>
            <th style={{padding:'12px 14px',fontSize:12,color:'#666660',fontWeight:600}}>Items</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => {
            const isOpen = openOrderId === order.id
            return [
              <tr
                key={`${order.id}-summary`}
                onClick={() => toggleOrder(order.id)}
                style={{borderBottom:'1px solid #f2f2ef',verticalAlign:'top',cursor:'pointer'}}>
                <td style={{padding:'12px 14px',fontSize:13,color:'#4f4f49'}}>{formatDate(order.created_at)}</td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#4f4f49'}}>
                  <div>#{order.id}</div>
                  <div style={{color:'#8b8b84',marginTop:4,fontFamily:'monospace'}}>{order.client_reference_id || '-'}</div>
                </td>
                <td style={{padding:'12px 14px'}}>
                  <span style={{
                    fontSize:12,
                    padding:'4px 10px',
                    borderRadius:999,
                    background:statusStyle(order.status).bg,
                    color:statusStyle(order.status).color,
                    border:'1px solid ' + statusStyle(order.status).border,
                    display:'inline-block',
                  }}>
                    {order.status || '-'}
                  </span>
                </td>
                <td style={{padding:'12px 14px',fontSize:13,color:'#4f4f49'}}>
                  <div>{order.email || '-'}</div>
                  <div style={{color:'#8b8b84',marginTop:4}}>{order.phone || '-'}</div>
                </td>
                <td style={{padding:'12px 14px',fontSize:13,color:'#111'}}>
                  {formatMoney(order.amount_total, order.currency)}
                </td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#4f4f49'}}>
                  <div>{order.shipping_name || '-'}</div>
                  <div style={{marginTop:4,color:'#8b8b84'}}>{formatShipping(order)}</div>
                </td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#4f4f49'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span>{Array.isArray(order.items_json) ? order.items_json.length : 0} {isOpen ? '▴' : '▾'}</span>
                    <a
                      href={`/admin/orders/${order.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{fontSize:12,color:'#2563eb',textDecoration:'none'}}>
                      details
                    </a>
                  </div>
                </td>
              </tr>,
              isOpen ? (
                <tr key={`${order.id}-details`} style={{borderBottom:'1px solid #f2f2ef',background:'#fcfcfb'}}>
                  <td />
                  <td colSpan={6} style={{padding:'10px 14px 14px',fontSize:12,color:'#5f5f58'}}>
                    <div style={{fontWeight:600,color:'#44443d',marginBottom:6}}>Items</div>
                    <div>{formatOrderItems(order.items_json)}</div>
                  </td>
                </tr>
              ) : null,
            ]
          })}
          {filteredOrders.length === 0 && (
            <tr>
              <td colSpan={7} style={{padding:'24px',textAlign:'center',color:'#8b8b84',fontSize:14}}>
                No matching orders
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </>
  )
}
