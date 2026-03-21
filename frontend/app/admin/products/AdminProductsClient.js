'use client'
import { useEffect, useMemo, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import { getApiUrl } from '../../lib/api'
import AdminTopBar from '../../components/AdminTopBar'

async function fetchJsonWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export default function AdminProductsClient() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [hideArchived, setHideArchived] = useState(true)

  async function loadProducts() {
    setError('')
    setLoading(true)
    try {
      const data = await fetchJsonWithTimeout(getApiUrl('/products/admin'), 2500)
      setProducts(data)
    } catch (error) {
      setError(error?.name === 'AbortError' ? 'Request timeout. Check backend status.' : (error?.message || 'Failed to load products'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await fetchJsonWithTimeout(getApiUrl('/products/admin'), 2500)
        if (mounted) setProducts(data)
      } catch (error) {
        if (mounted) setError(error?.name === 'AbortError' ? 'Request timeout. Check backend status.' : (error?.message || 'Failed to load products'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (hideArchived) {
        const isArchivedName = String(p.name || '').startsWith('[ARCHIVED]')
        const isArchivedCategory = String(p.category || '').toLowerCase() === 'archived'
        if (isArchivedName || isArchivedCategory) return false
      }
      if (!q) return true
      const source = [p.name, p.category, String(p.id)].join(' ').toLowerCase()
      return source.includes(q)
    })
  }, [products, query, hideArchived])

  return (
    <AdminOnly>
      <main style={{maxWidth:1200,margin:'0 auto',padding:'40px 24px 72px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:18}}>
          <h1 style={{fontSize:30,fontWeight:600,margin:0}}>Products</h1>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <p style={{fontSize:14,color:'#80807a',margin:0}}>{filtered.length} shown</p>
            <a href="/admin/products/new" style={{background:'#111',color:'#fff',padding:'8px 12px',borderRadius:10,fontSize:13,textDecoration:'none'}}>
              + New product
            </a>
          </div>
        </div>
        <AdminTopBar active="products" />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, category, id"
          style={{width:'100%',maxWidth:420,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,marginBottom:14}}
        />
        <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#555',marginBottom:14,cursor:'pointer'}}>
          <input
            type="checkbox"
            checked={hideArchived}
            onChange={(e) => setHideArchived(e.target.checked)}
          />
          Hide archived
        </label>

        {loading ? (
          <p style={{color:'#888'}}>Loading products...</p>
        ) : error ? (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <p style={{color:'#b91c1c',margin:0}}>Error: {error}</p>
            <button
              onClick={loadProducts}
              style={{border:'1px solid #ddd',background:'#fff',borderRadius:8,padding:'6px 10px',fontSize:13,cursor:'pointer'}}>
              Retry
            </button>
          </div>
        ) : (
          <div style={{overflowX:'auto',border:'1px solid #ecece8',borderRadius:14,background:'#fff'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:920}}>
              <thead>
                <tr style={{textAlign:'left',borderBottom:'1px solid #ecece8',background:'#fafaf8'}}>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>ID</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Product</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Category</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Price</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Available</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Reserved</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{borderBottom:'1px solid #f2f2ef'}}>
                    <td style={{padding:'12px 14px',fontSize:13,color:'#555'}}>{p.id}</td>
                    <td style={{padding:'12px 14px',fontSize:13}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:44,height:56,background:'#f4f4f1',borderRadius:8,overflow:'hidden',flexShrink:0}}>
                          {p.image_url ? <img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : null}
                        </div>
                        <div>{p.name}</div>
                      </div>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:13,color:'#555'}}>{p.category || '-'}</td>
                    <td style={{padding:'12px 14px',fontSize:13}}>${Number(p.price || 0).toFixed(2)}</td>
                    <td style={{padding:'12px 14px',fontSize:13}}>{p.available_stock ?? p.stock ?? 0}</td>
                    <td style={{padding:'12px 14px',fontSize:13}}>{p.reserved_stock ?? 0}</td>
                    <td style={{padding:'12px 14px'}}>
                      <a href={`/admin/products/${p.id}`} style={{fontSize:13,color:'#2563eb',textDecoration:'none'}}>Edit</a>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{padding:'20px',textAlign:'center',fontSize:14,color:'#8b8b84'}}>No products found</td>
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
