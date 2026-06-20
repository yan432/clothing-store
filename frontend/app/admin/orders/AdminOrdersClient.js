'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'
import OrdersTable from './OrdersTable'
import PageHeader from '../_components/PageHeader'

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const mounted = useRef(true)

  const load = useCallback(async function loadOrders(attempt = 1) {
    if (!mounted.current) return
    setLoading(true)
    setError('')
    setRetryCount(attempt - 1)
    try {
      const res = await fetch(getApiUrl('/orders'), { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      if (mounted.current) { setOrders(data); setLoading(false) }
    } catch {
      if (!mounted.current) return
      if (attempt < 7) {
        setTimeout(() => loadOrders(attempt + 1), 5000)
      } else {
        setError('Server not responding. Try refreshing the page.')
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    load()
    return () => { mounted.current = false }
  }, [load])

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={loading ? null : `${orders.length} total`}
      />
      {loading ? (
          <div>
            <p style={{color:'#888'}}>{retryCount === 0 ? 'Loading orders…' : `Connecting to server… (${retryCount + 1}/7)`}</p>
            {retryCount > 0 && <p style={{fontSize:12,color:'#bbb',marginTop:4}}>Server is waking up, please wait…</p>}
          </div>
        ) : error ? (
          <div>
            <p style={{color:'#b91c1c'}}>{error}</p>
            <button onClick={() => load()} style={{marginTop:8,padding:'8px 16px',borderRadius:8,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Retry</button>
          </div>
        ) : (
        <OrdersTable orders={orders} />
      )}
    </>
  )
}
