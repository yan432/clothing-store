'use client'
import { useEffect, useMemo, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'
import AdminTopBar from '../../components/AdminTopBar'
import NewProductClient from './new/NewProductClient'
import InventoryClient from '../inventory/InventoryClient'

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
  const ORDER_TAG_PREFIXES = ['order:fixed', 'order:random', 'order:priority:']
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [hideArchived, setHideArchived] = useState(true)
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('id_desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkOrderSaving, setBulkOrderSaving] = useState(false)
  const [orderDrafts, setOrderDrafts] = useState({})

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
    const base = products.filter((p) => {
      if (hideArchived) {
        const isArchivedName = String(p.name || '').startsWith('[ARCHIVED]')
        const isArchivedCategory = String(p.category || '').toLowerCase() === 'archived'
        if (isArchivedName || isArchivedCategory) return false
      }
      if (visibilityFilter === 'hidden') return Boolean(p.is_hidden)
      if (visibilityFilter === 'visible') return !Boolean(p.is_hidden)
      if (!q) return true
      const source = [p.name, p.category, String(p.id)].join(' ').toLowerCase()
      if (!source.includes(q)) return false
      return true
    })
    const sorted = [...base]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'id_asc': return (a.id || 0) - (b.id || 0)
        case 'id_desc': return (b.id || 0) - (a.id || 0)
        case 'name_asc': return String(a.name || '').localeCompare(String(b.name || ''))
        case 'name_desc': return String(b.name || '').localeCompare(String(a.name || ''))
        case 'price_asc': return Number(a.price || 0) - Number(b.price || 0)
        case 'price_desc': return Number(b.price || 0) - Number(a.price || 0)
        case 'stock_asc': return Number(a.available_stock ?? a.stock ?? 0) - Number(b.available_stock ?? b.stock ?? 0)
        case 'stock_desc': return Number(b.available_stock ?? b.stock ?? 0) - Number(a.available_stock ?? a.stock ?? 0)
        default: return (b.id || 0) - (a.id || 0)
      }
    })
    return sorted
  }, [products, query, hideArchived, sortBy, visibilityFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  useEffect(() => {
    setPage(1)
  }, [query, hideArchived, sortBy, pageSize, visibilityFilter])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filtered.some((p) => p.id === id)))
  }, [filtered])

  async function handleToggleVisibility(product) {
    setError('')
    setUpdatingVisibilityId(product.id)
    try {
      const nextHidden = !Boolean(product.is_hidden)
      const res = await fetch(getApiUrl('/products/' + product.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: nextHidden }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to update visibility')
      }
      setProducts((prev) => prev.map((p) => (
        p.id === product.id ? { ...p, is_hidden: nextHidden } : p
      )))
    } catch (e) {
      setError(e?.message || 'Failed to update visibility')
    } finally {
      setUpdatingVisibilityId(null)
    }
  }

  function parseOrderMeta(tagsValue) {
    const tags = Array.isArray(tagsValue) ? tagsValue : []
    const priorityTag = tags.find((tag) => String(tag).startsWith('order:priority:'))
    const parsedPriority = priorityTag ? Number(String(priorityTag).split('order:priority:')[1]) : null
    const mode = tags.includes('order:fixed')
      ? 'mandatory'
      : tags.includes('order:random')
        ? 'random'
        : 'standard'
    return {
      mode,
      priority: Number.isFinite(parsedPriority) ? parsedPriority : 0,
    }
  }

  function tagsWithOrder(tagsValue, mode, priority) {
    const tags = Array.isArray(tagsValue) ? tagsValue : []
    const kept = tags.filter((tag) => (
      !ORDER_TAG_PREFIXES.some((prefix) => (
        prefix.endsWith(':') ? String(tag).startsWith(prefix) : tag === prefix
      ))
    ))
    if (mode === 'mandatory') {
      const safePriority = Math.max(0, Number(priority || 0))
      return [...kept, 'order:fixed', `order:priority:${safePriority}`]
    }
    if (mode === 'random') {
      return [...kept, 'order:random']
    }
    return kept
  }

  async function updateProductOrder(product, mode, priority) {
    setError('')
    setUpdatingOrderId(product.id)
    try {
      const nextTags = tagsWithOrder(product.tags, mode, priority)
      const res = await fetch(getApiUrl('/products/' + product.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: nextTags }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to update order mode')
      }
      setProducts((prev) => prev.map((p) => (
        p.id === product.id ? { ...p, tags: nextTags } : p
      )))
      if (mode === 'mandatory') {
        setOrderDrafts((prev) => ({ ...prev, [product.id]: String(Math.max(0, Number(priority || 0))) }))
      }
    } catch (e) {
      setError(e?.message || 'Failed to update order mode')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ))
  }

  function selectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      paged.forEach((p) => next.add(p.id))
      return Array.from(next)
    })
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function runBulkVisibility(nextHidden) {
    if (!selectedIds.length) return
    setError('')
    setBulkSaving(true)
    try {
      await Promise.all(selectedIds.map(async (id) => {
        const res = await fetch(getApiUrl('/products/' + id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_hidden: nextHidden }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Failed to update product #${id}`)
        }
      }))
      setProducts((prev) => prev.map((p) => (
        selectedIds.includes(p.id) ? { ...p, is_hidden: nextHidden } : p
      )))
      setSelectedIds([])
    } catch (e) {
      setError(e?.message || 'Bulk update failed')
    } finally {
      setBulkSaving(false)
    }
  }

  async function runBulkOrderMode(mode) {
    if (!selectedIds.length) return
    setError('')
    setBulkOrderSaving(true)
    try {
      await Promise.all(selectedIds.map(async (id) => {
        const product = products.find((p) => p.id === id)
        if (!product) return
        const nextTags = tagsWithOrder(product.tags, mode, 0)
        const res = await fetch(getApiUrl('/products/' + id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: nextTags }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Failed to update product #${id}`)
        }
      }))
      setProducts((prev) => prev.map((p) => (
        selectedIds.includes(p.id)
          ? { ...p, tags: tagsWithOrder(p.tags, mode, 0) }
          : p
      )))
      setSelectedIds([])
    } catch (e) {
      setError(e?.message || 'Bulk order update failed')
    } finally {
      setBulkOrderSaving(false)
    }
  }

  function sortDirection(key) {
    if (!sortBy.startsWith(key + '_')) return null
    return sortBy.endsWith('_asc') ? 'asc' : 'desc'
  }

  function toggleSort(key) {
    const dir = sortDirection(key)
    if (!dir) {
      setSortBy(`${key}_asc`)
      return
    }
    setSortBy(`${key}_${dir === 'asc' ? 'desc' : 'asc'}`)
  }

  function sortIcon(key) {
    const dir = sortDirection(key)
    if (!dir) return '↕'
    return dir === 'asc' ? '↑' : '↓'
  }

  return (
    <AdminOnly>
      <main style={{maxWidth:1200,margin:'0 auto',padding:'40px 24px 72px'}}>
        <h1 style={{fontSize:30,fontWeight:600,margin:'0 0 18px'}}>Products</h1>
        <AdminTopBar active="products" />

        {/* Inner tabs */}
        <div style={{display:'flex',gap:0,marginBottom:24,borderBottom:'2px solid #ecece8'}}>
          {[['products','All Products'],['new','Add New'],['inventory','Inventory']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background:'none', border:'none', padding:'8px 18px', fontSize:14, cursor:'pointer',
              fontWeight: tab === id ? 700 : 400,
              color: tab === id ? '#111' : '#888',
              borderBottom: tab === id ? '2px solid #111' : '2px solid transparent',
              marginBottom: -2,
            }}>{label}</button>
          ))}
        </div>

        {tab === 'new' && <NewProductClient inTab />}
        {tab === 'inventory' && <InventoryClient />}
        {tab === 'products' && <>

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
        <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            style={{border:'1px solid #ddd',borderRadius:10,padding:'8px 10px',fontSize:13}}>
            <option value="all">Visibility: All</option>
            <option value="visible">Visibility: Visible</option>
            <option value="hidden">Visibility: Hidden</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{border:'1px solid #ddd',borderRadius:10,padding:'8px 10px',fontSize:13}}>
            <option value="id_desc">Newest (ID desc)</option>
            <option value="id_asc">Oldest (ID asc)</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="price_asc">Price low-high</option>
            <option value="price_desc">Price high-low</option>
            <option value="stock_asc">Stock low-high</option>
            <option value="stock_desc">Stock high-low</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{border:'1px solid #ddd',borderRadius:10,padding:'8px 10px',fontSize:13}}>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <span style={{fontSize:12,color:'#777'}}>Page {safePage} / {totalPages}</span>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
          <button
            type="button"
            onClick={selectAllOnPage}
            disabled={!paged.length || bulkSaving}
            style={{border:'1px solid #ddd',borderRadius:8,padding:'6px 10px',fontSize:12,background:'#fff',cursor:'pointer',opacity:(!paged.length || bulkSaving) ? 0.6 : 1}}>
            Select page
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={!selectedIds.length || bulkSaving}
            style={{border:'1px solid #ddd',borderRadius:8,padding:'6px 10px',fontSize:12,background:'#fff',cursor:'pointer',opacity:(!selectedIds.length || bulkSaving) ? 0.6 : 1}}>
            Clear
          </button>
          <button
            type="button"
            onClick={() => runBulkVisibility(false)}
            disabled={!selectedIds.length || bulkSaving}
            style={{border:'1px solid #bbf7d0',borderRadius:999,padding:'6px 10px',fontSize:12,background:'#ecfdf3',color:'#166534',cursor:'pointer',opacity:(!selectedIds.length || bulkSaving) ? 0.6 : 1}}>
            {bulkSaving ? 'Saving...' : `Bulk publish (${selectedIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => runBulkVisibility(true)}
            disabled={!selectedIds.length || bulkSaving}
            style={{border:'1px solid #fde68a',borderRadius:999,padding:'6px 10px',fontSize:12,background:'#fffbeb',color:'#92400e',cursor:'pointer',opacity:(!selectedIds.length || bulkSaving) ? 0.6 : 1}}>
            {bulkSaving ? 'Saving...' : `Bulk hide (${selectedIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => runBulkOrderMode('standard')}
            disabled={!selectedIds.length || bulkOrderSaving}
            style={{border:'1px solid #ddd',borderRadius:999,padding:'6px 10px',fontSize:12,background:'#fff',color:'#333',cursor:'pointer',opacity:(!selectedIds.length || bulkOrderSaving) ? 0.6 : 1}}>
            {bulkOrderSaving ? 'Saving...' : `Bulk standard (${selectedIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => runBulkOrderMode('mandatory')}
            disabled={!selectedIds.length || bulkOrderSaving}
            style={{border:'1px solid #c7d2fe',borderRadius:999,padding:'6px 10px',fontSize:12,background:'#eef2ff',color:'#3730a3',cursor:'pointer',opacity:(!selectedIds.length || bulkOrderSaving) ? 0.6 : 1}}>
            {bulkOrderSaving ? 'Saving...' : `Bulk mandatory (${selectedIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => runBulkOrderMode('random')}
            disabled={!selectedIds.length || bulkOrderSaving}
            style={{border:'1px solid #ddd6fe',borderRadius:999,padding:'6px 10px',fontSize:12,background:'#f5f3ff',color:'#6d28d9',cursor:'pointer',opacity:(!selectedIds.length || bulkOrderSaving) ? 0.6 : 1}}>
            {bulkOrderSaving ? 'Saving...' : `Bulk random (${selectedIds.length})`}
          </button>
          <span style={{fontSize:12,color:'#777'}}>Selected: {selectedIds.length}</span>
        </div>

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
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:1120}}>
              <thead>
                <tr style={{textAlign:'left',borderBottom:'1px solid #ecece8',background:'#fafaf8'}}>
                  <th style={{padding:'12px 8px',fontSize:12,color:'#666660',width:32}}>
                    <input
                      type="checkbox"
                      aria-label="select all on page"
                      checked={paged.length > 0 && paged.every((p) => selectedIds.includes(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllOnPage()
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => !paged.some((p) => p.id === id)))
                        }
                      }}
                    />
                  </th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>
                    <button type="button" onClick={() => toggleSort('id')} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:12,color:'#666660',fontWeight:600}}>
                      ID {sortIcon('id')}
                    </button>
                  </th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>
                    <button type="button" onClick={() => toggleSort('name')} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:12,color:'#666660',fontWeight:600}}>
                      Product {sortIcon('name')}
                    </button>
                  </th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Category</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Visibility</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>
                    <button type="button" onClick={() => toggleSort('price')} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:12,color:'#666660',fontWeight:600}}>
                      Price {sortIcon('price')}
                    </button>
                  </th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>
                    <button type="button" onClick={() => toggleSort('stock')} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:12,color:'#666660',fontWeight:600}}>
                      Available {sortIcon('stock')}
                    </button>
                  </th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Reserved</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Order</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.id} style={{borderBottom:'1px solid #f2f2ef'}}>
                    <td style={{padding:'12px 8px'}}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        aria-label={`select product ${p.id}`}
                      />
                    </td>
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
                    <td style={{padding:'12px 14px',fontSize:12}}>
                      <span style={{
                        border:'1px solid ' + (p.is_hidden ? '#fde68a' : '#bbf7d0'),
                        background:p.is_hidden ? '#fffbeb' : '#ecfdf3',
                        color:p.is_hidden ? '#92400e' : '#166534',
                        borderRadius:999,
                        padding:'3px 8px',
                        display:'inline-block',
                      }}>
                        {p.is_hidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:13}}>${Number(p.price || 0).toFixed(2)}</td>
                    <td style={{padding:'12px 14px',fontSize:13}}>{p.available_stock ?? p.stock ?? 0}</td>
                    <td style={{padding:'12px 14px',fontSize:13}}>{p.reserved_stock ?? 0}</td>
                    <td style={{padding:'12px 14px'}}>
                      {(() => {
                        const meta = parseOrderMeta(p.tags)
                        const draftPriority = orderDrafts[p.id] ?? String(meta.priority)
                        const isSaving = updatingOrderId === p.id
                        return (
                          <div style={{display:'flex',flexDirection:'column',gap:6,minWidth:210}}>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => updateProductOrder(p, 'standard', 0)}
                                style={{border:'1px solid ' + (meta.mode === 'standard' ? '#111' : '#ddd'),background:meta.mode === 'standard' ? '#111' : '#fff',color:meta.mode === 'standard' ? '#fff' : '#444',borderRadius:999,padding:'4px 8px',fontSize:11,cursor:'pointer',opacity:isSaving ? 0.65 : 1}}>
                                Standard
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => updateProductOrder(p, 'mandatory', draftPriority)}
                                style={{border:'1px solid ' + (meta.mode === 'mandatory' ? '#3730a3' : '#c7d2fe'),background:meta.mode === 'mandatory' ? '#3730a3' : '#eef2ff',color:meta.mode === 'mandatory' ? '#fff' : '#3730a3',borderRadius:999,padding:'4px 8px',fontSize:11,cursor:'pointer',opacity:isSaving ? 0.65 : 1}}>
                                Mandatory
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => updateProductOrder(p, 'random', 0)}
                                style={{border:'1px solid ' + (meta.mode === 'random' ? '#6d28d9' : '#ddd6fe'),background:meta.mode === 'random' ? '#6d28d9' : '#f5f3ff',color:meta.mode === 'random' ? '#fff' : '#6d28d9',borderRadius:999,padding:'4px 8px',fontSize:11,cursor:'pointer',opacity:isSaving ? 0.65 : 1}}>
                                Random
                              </button>
                            </div>
                            {meta.mode === 'mandatory' && (
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={draftPriority}
                                  onChange={(e) => setOrderDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                  style={{width:72,border:'1px solid #ddd',borderRadius:8,padding:'4px 6px',fontSize:12}}
                                />
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => updateProductOrder(p, 'mandatory', draftPriority)}
                                  style={{border:'1px solid #ddd',background:'#fff',color:'#444',borderRadius:8,padding:'4px 8px',fontSize:11,cursor:'pointer',opacity:isSaving ? 0.65 : 1}}>
                                  Save prio
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <a href={`/admin/products/${p.id}`} style={{fontSize:13,color:'#2563eb',textDecoration:'none'}}>Edit</a>
                        <button
                          type="button"
                          disabled={updatingVisibilityId === p.id}
                          onClick={() => handleToggleVisibility(p)}
                          style={{
                            border:'1px solid ' + (p.is_hidden ? '#bbf7d0' : '#fde68a'),
                            background:p.is_hidden ? '#ecfdf3' : '#fffbeb',
                            color:p.is_hidden ? '#166534' : '#92400e',
                            borderRadius:999,
                            padding:'4px 9px',
                            fontSize:12,
                            cursor:'pointer',
                            opacity:updatingVisibilityId === p.id ? 0.65 : 1,
                          }}>
                          {updatingVisibilityId === p.id ? 'Saving...' : (p.is_hidden ? 'Publish now' : 'Hide')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{padding:'20px',textAlign:'center',fontSize:14,color:'#8b8b84'}}>No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
            <p style={{fontSize:12,color:'#777',margin:0}}>
              Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </p>
            <div style={{display:'flex',gap:8}}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                style={{border:'1px solid #ddd',borderRadius:8,padding:'6px 10px',fontSize:13,background:'#fff',cursor:'pointer',opacity:safePage <= 1 ? 0.5 : 1}}>
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                style={{border:'1px solid #ddd',borderRadius:8,padding:'6px 10px',fontSize:13,background:'#fff',cursor:'pointer',opacity:safePage >= totalPages ? 0.5 : 1}}>
                Next
              </button>
            </div>
          </div>
        )}
        </>}
      </main>
    </AdminOnly>
  )
}
