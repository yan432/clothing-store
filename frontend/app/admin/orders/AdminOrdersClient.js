'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'
import OrdersTable from './OrdersTable'
import AdminOnly from '../../components/AdminOnly'
import AdminTopBar from '../../components/AdminTopBar'

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [notionSyncing, setNotionSyncing] = useState(false)
  const [notionResult, setNotionResult] = useState(null)
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

  const syncToNotion = async () => {
    setNotionSyncing(true)
    setNotionResult(null)
    try {
      const res = await fetch(getApiUrl('/admin/notion/sync-orders'), { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
      setNotionResult({ ok: true, message: `✓ ${data.created} created, ${data.updated} updated (${data.total} total)` })
    } catch (e) {
      setNotionResult({ ok: false, message: e.message })
    } finally {
      setNotionSyncing(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    load()
    return () => { mounted.current = false }
  }, [load])

  return (
    <AdminOnly>
      <main style={{maxWidth:1200,margin:'0 auto',padding:'40px 24px 72px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h1 style={{fontSize:30,fontWeight:600,margin:0}}>Orders</h1>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <p style={{fontSize:14,color:'#80807a',margin:0}}>{orders.length} total</p>
            <button
              onClick={syncToNotion}
              disabled={notionSyncing}
              style={{
                border:'1px solid #e5e5e0', borderRadius:8, padding:'7px 14px',
                fontSize:13, cursor: notionSyncing ? 'default' : 'pointer',
                background:'#fff', color:'#333',
                opacity: notionSyncing ? 0.6 : 1,
              }}
            >
              {notionSyncing ? 'Syncing…' : 'Sync to Notion'}
            </button>
          </div>
        </div>
        {notionResult && (
          <p style={{fontSize:13, color: notionResult.ok ? '#166534' : '#b91c1c', marginBottom:16, marginTop:-8}}>
            {notionResult.message}
          </p>
        )}
        <AdminTopBar active="orders" />

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
      </main>
    </AdminOnly>
  )
}
