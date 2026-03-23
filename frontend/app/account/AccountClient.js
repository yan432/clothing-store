'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'

const accountSections = [
  { id: 'overview', title: 'My account', text: 'Manage your account details and settings.' },
  { id: 'orders', title: 'Orders', text: 'See your order history and current statuses.' },
  { id: 'returns', title: 'Returns', text: 'Start and track your returns in one place.' },
  { id: 'sizes', title: 'My sizes', text: 'Save preferred sizes for faster checkout.' },
  { id: 'help', title: 'Help & FAQ', text: 'Find answers to common questions and support info.' },
]

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

function formatItemLine(item) {
  const name = String(item?.name || 'Item')
  const qty = Math.max(1, Number(item?.quantity || 1))
  const size = String(item?.size || '').trim()
  return `${name}${size ? ` (${size})` : ''} x${qty}`
}

export default function AccountClient({ activeTab }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  const activeSection = useMemo(() => {
    return accountSections.find((item) => item.id === activeTab) || accountSections[0]
  }, [activeTab])

  useEffect(() => {
    if (activeSection.id !== 'orders') return
    if (!user?.email) return

    let mounted = true
    async function loadOrders() {
      try {
        setOrdersLoading(true)
        setOrdersError('')
        const res = await fetch(`${getApiUrl('/orders/track')}?email=${encodeURIComponent(user.email)}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load your orders')
        const data = await res.json()
        if (mounted) setOrders(Array.isArray(data) ? data : [])
      } catch (e) {
        if (mounted) setOrdersError(e.message || 'Failed to load your orders')
      } finally {
        if (mounted) setOrdersLoading(false)
      }
    }
    loadOrders()
    return () => { mounted = false }
  }, [activeSection.id, user?.email])

  return (
    <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
      <h1 style={{fontSize:42,lineHeight:1.06,fontWeight:500,marginBottom:20}}>Profile</h1>
      {user && (
        <p style={{fontSize:15,color:'#575757',marginBottom:28}}>
          Signed in as {user.email}
        </p>
      )}

      <section style={{display:'grid',gridTemplateColumns:'minmax(240px,320px) minmax(0,1fr)',gap:22}}>
        <aside style={{border:'1px solid #e2e2e2',background:'#fafafa'}}>
          {accountSections.map((item) => {
            const isActive = item.id === activeSection.id
            return (
              <a
                key={item.id}
                href={item.id === 'overview' ? '/account' : `/account?tab=${item.id}`}
                style={{
                  display:'block',
                  padding:'15px 18px',
                  borderBottom:'1px solid #e6e6e6',
                  background:isActive ? '#efefef' : 'transparent',
                  fontWeight:isActive ? 600 : 500,
                  color:'#111',
                }}
              >
                {item.title}
              </a>
            )
          })}
        </aside>

        <article style={{border:'1px solid #e2e2e2',background:'#fff',padding:'24px 24px 28px',minHeight:260}}>
          <h2 style={{fontSize:30,lineHeight:1.1,fontWeight:500,marginBottom:12}}>{activeSection.title}</h2>
          {activeSection.id !== 'orders' ? (
            <>
              <p style={{fontSize:16,lineHeight:1.6,color:'#333',maxWidth:620}}>{activeSection.text}</p>
              <p style={{marginTop:24,fontSize:14,color:'#5e5e5e'}}>
                This page is prepared as a base. Next, we can add real content, API integration,
                and detailed UI for each section.
              </p>
            </>
          ) : !user ? (
            <p style={{fontSize:15,lineHeight:1.6,color:'#666'}}>Sign in to view your order tracking.</p>
          ) : ordersLoading ? (
            <p style={{fontSize:15,color:'#666'}}>Loading your orders...</p>
          ) : ordersError ? (
            <p style={{fontSize:15,color:'#b91c1c'}}>Error: {ordersError}</p>
          ) : orders.length === 0 ? (
            <p style={{fontSize:15,color:'#666'}}>No orders yet for {user.email}.</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:8}}>
              {orders.map((order) => {
                const items = Array.isArray(order.items_json) ? order.items_json : []
                return (
                  <div key={order.id} style={{border:'1px solid #ecece8',borderRadius:12,padding:'14px 16px',background:'#fff'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <div>
                        <p style={{margin:0,fontSize:16,fontWeight:600}}>Order #{order.user_order_number || order.id}</p>
                        <p style={{margin:'4px 0 0',fontSize:12,color:'#666'}}>Placed: {formatDate(order.created_at)}</p>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:'#166534',background:'#dcfce7',padding:'6px 10px',borderRadius:999}}>
                        Paid
                      </span>
                    </div>
                    <div style={{marginTop:10,fontSize:13,color:'#444'}}>
                      <p style={{margin:'0 0 4px'}}>Items: {items.length}</p>
                      <p style={{margin:'0 0 4px'}}>
                        Ordered: {items.length ? items.map((item) => formatItemLine(item)).join(', ') : '-'}
                      </p>
                      <p style={{margin:'0 0 4px'}}>Total: {formatMoney(order.amount_total, order.currency || 'EUR')}</p>
                      <p style={{margin:0}}>Last update: {formatDate(order.updated_at || order.created_at)}</p>
                    </div>
                    <div style={{marginTop:10}}>
                      <Link href={`/account/orders/${order.id}`} style={{fontSize:13,fontWeight:600,color:'#111',textDecoration:'underline'}}>
                        Open order details
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
