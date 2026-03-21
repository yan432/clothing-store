'use client'
import { useEffect, useState } from 'react'
import { getApiUrl } from '../../lib/api'
import OrdersTable from './OrdersTable'
import AdminOnly from '../../components/AdminOnly'
import AdminTopBar from '../../components/AdminTopBar'

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(getApiUrl('/orders'), { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load orders')
        const data = await res.json()
        if (mounted) setOrders(data)
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load orders')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <AdminOnly>
      <main style={{maxWidth:1200,margin:'0 auto',padding:'40px 24px 72px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:20}}>
          <h1 style={{fontSize:30,fontWeight:600,margin:0}}>Orders</h1>
          <p style={{fontSize:14,color:'#80807a',margin:0}}>{orders.length} total</p>
        </div>
        <AdminTopBar active="orders" />

        {loading ? (
          <p style={{color:'#888'}}>Loading orders...</p>
        ) : error ? (
          <p style={{color:'#b91c1c'}}>Error: {error}</p>
        ) : (
          <OrdersTable orders={orders} />
        )}
      </main>
    </AdminOnly>
  )
}
