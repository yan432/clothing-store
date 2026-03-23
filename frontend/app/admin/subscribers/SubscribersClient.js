'use client'

import { useEffect, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import AdminTopBar from '../../components/AdminTopBar'
import { getApiUrl } from '../../lib/api'

export default function SubscribersClient() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(getApiUrl('/email-subscribers?limit=1000'), { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load subscribers')
        const data = await res.json()
        if (mounted) setItems(data)
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load subscribers')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  function formatDate(value) {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  }

  return (
    <AdminOnly>
      <main style={{maxWidth:1200,margin:'0 auto',padding:'40px 24px 72px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:18}}>
          <h1 style={{fontSize:30,fontWeight:600,margin:0}}>Subscribers</h1>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <p style={{fontSize:14,color:'#80807a',margin:0}}>{items.length} total</p>
            <a
              href={getApiUrl('/email-subscribers/export.csv')}
              style={{background:'#111',color:'#fff',padding:'8px 12px',borderRadius:10,fontSize:13,textDecoration:'none'}}
            >
              Download CSV
            </a>
          </div>
        </div>
        <AdminTopBar active="subscribers" />

        {loading ? (
          <p style={{color:'#888'}}>Loading subscribers...</p>
        ) : error ? (
          <p style={{color:'#b91c1c'}}>Error: {error}</p>
        ) : (
          <div style={{overflowX:'auto',border:'1px solid #ecece8',borderRadius:14,background:'#fff'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
              <thead>
                <tr style={{textAlign:'left',borderBottom:'1px solid #ecece8',background:'#fafaf8'}}>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Email</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>First source</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Last source</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Events</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>First seen</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} style={{borderBottom:'1px solid #f2f2ef'}}>
                    <td style={{padding:'12px 14px',fontSize:13}}>{row.email}</td>
                    <td style={{padding:'12px 14px',fontSize:13,color:'#555'}}>{row.first_source || '-'}</td>
                    <td style={{padding:'12px 14px',fontSize:13,color:'#555'}}>{row.last_source || '-'}</td>
                    <td style={{padding:'12px 14px',fontSize:13}}>{row.events_count || 0}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>{formatDate(row.first_seen_at)}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>{formatDate(row.last_seen_at)}</td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={6} style={{padding:'20px',textAlign:'center',fontSize:14,color:'#8b8b84'}}>No subscribers yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminOnly>
  )
}
