'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import AdminTopBar from '../../components/AdminTopBar'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'

function randomCode(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

function formatDate(value) {
  if (!value) return 'Never'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Invalid date'
  return d.toLocaleString()
}

function toDateTimeLocalInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getPromoState(row) {
  const now = Date.now()
  const isExpired = row.expires_at ? new Date(row.expires_at).getTime() <= now : false
  const limitReached = row.usage_limit != null && Number(row.used_count || 0) >= Number(row.usage_limit || 0)
  const isInactive = row.is_active === false
  const active = !isInactive && !isExpired && !limitReached
  return { active, isExpired, limitReached, isInactive }
}

export default function PromoCodesClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    mode: 'random',
    code: '',
    discount_type: 'percent',
    discount_value: '10',
    usage_limit: '',
    expires_at: '',
    one_per_email: false,
  })
  const [editForm, setEditForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '10',
    usage_limit: '',
    expires_at: '',
    is_active: true,
    one_per_email: false,
  })

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function loadPromoCodes() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(getApiUrl('/promo-codes/admin'), { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load promo codes')
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || 'Failed to load promo codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPromoCodes()
  }, [])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const state = getPromoState(row)
      if (statusFilter === 'all') return true
      if (statusFilter === 'active') return state.active
      if (statusFilter === 'expired') return state.isExpired
      if (statusFilter === 'limit_reached') return state.limitReached
      if (statusFilter === 'inactive') return state.isInactive
      return true
    })
  }, [rows, statusFilter])

  function startEdit(row) {
    setEditingId(row.id)
    setEditForm({
      code: row.code || '',
      discount_type: row.discount_type || 'percent',
      discount_value: row.discount_type === 'free_shipping' ? '0' : String(row.discount_value ?? '10'),
      usage_limit: row.usage_limit == null ? '' : String(row.usage_limit),
      expires_at: toDateTimeLocalInput(row.expires_at),
      is_active: row.is_active !== false,
      one_per_email: Boolean(row.one_per_email),
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        code: form.mode === 'manual' ? form.code.trim().toUpperCase() : null,
        discount_type: form.discount_type,
        discount_value: form.discount_type === 'free_shipping' ? 0 : Number(form.discount_value || 0),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        one_per_email: Boolean(form.one_per_email),
      }
      const res = await fetch(getApiUrl('/promo-codes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to create promo code')
      }
      setMessage('Promo code created')
      setForm((prev) => ({
        ...prev,
        code: '',
        usage_limit: '',
        expires_at: '',
      }))
      await loadPromoCodes()
    } catch (e) {
      setError(e?.message || 'Failed to create promo code')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setUpdatingId(editingId)
    setError('')
    setMessage('')
    try {
      const payload = {
        code: editForm.code.trim().toUpperCase(),
        discount_type: editForm.discount_type,
        discount_value: editForm.discount_type === 'free_shipping' ? 0 : Number(editForm.discount_value || 0),
        usage_limit: editForm.usage_limit ? Number(editForm.usage_limit) : null,
        expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null,
        is_active: Boolean(editForm.is_active),
        one_per_email: Boolean(editForm.one_per_email),
      }
      const res = await fetch(getApiUrl('/promo-codes/' + editingId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to update promo code')
      }
      const updated = await res.json()
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      setMessage('Promo code updated')
      setEditingId(null)
    } catch (e) {
      setError(e?.message || 'Failed to update promo code')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleToggleActive(row) {
    setUpdatingId(row.id)
    setError('')
    setMessage('')
    try {
      const res = await fetch(getApiUrl('/promo-codes/' + row.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !(row.is_active !== false) }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to update promo code')
      }
      const updated = await res.json()
      setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)))
    } catch (e) {
      setError(e?.message || 'Failed to update promo code')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete promo code ${row.code}?`)) return
    setDeletingId(row.id)
    setError('')
    setMessage('')
    try {
      const res = await fetch(getApiUrl('/promo-codes/' + row.id), { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to delete promo code')
      }
      setRows((prev) => prev.filter((item) => item.id !== row.id))
      if (editingId === row.id) setEditingId(null)
      setMessage('Promo code deleted')
    } catch (e) {
      setError(e?.message || 'Failed to delete promo code')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AdminOnly>
      <main style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px 72px'}}>
        <h1 style={{fontSize:30,fontWeight:600,margin:'0 0 18px'}}>Promo codes</h1>
        <AdminTopBar active="promos" />

        <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:12,background:'#fff',border:'1px solid #ecece8',borderRadius:12,padding:16,marginBottom:18}}>
          {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#b91c1c',borderRadius:10,padding:'10px 12px',fontSize:14}}>{error}</div>}
          {message && <div style={{background:'#ecfdf3',border:'1px solid #bbf7d0',color:'#166534',borderRadius:10,padding:'10px 12px',fontSize:14}}>{message}</div>}

          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
              <input type="radio" checked={form.mode === 'random'} onChange={() => setField('mode', 'random')} />
              Random code
            </label>
            <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
              <input type="radio" checked={form.mode === 'manual'} onChange={() => setField('mode', 'manual')} />
              Manual code
            </label>
          </div>

          {form.mode === 'manual' ? (
            <label style={{fontSize:13,color:'#444'}}>Code
              <input
                required
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                placeholder="WELCOME15"
                style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
              />
            </label>
          ) : (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input
                readOnly
                value={form.code || 'Will be generated on create'}
                style={{flex:1,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,background:'#fafafa'}}
              />
              <button type="button" onClick={() => setField('code', randomCode())}
                style={{border:'1px solid #ddd',borderRadius:10,background:'#fff',padding:'10px 12px',fontSize:13,cursor:'pointer'}}>
                Generate
              </button>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <label style={{fontSize:13,color:'#444'}}>Discount type
              <select
                value={form.discount_type}
                onChange={(e) => setField('discount_type', e.target.value)}
                style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,background:'#fff'}}
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed (€)</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </label>
            <label style={{fontSize:13,color:'#444'}}>Discount value
              <input
                type="number"
                min="0.01"
                step="0.01"
                required={form.discount_type !== 'free_shipping'}
                disabled={form.discount_type === 'free_shipping'}
                value={form.discount_value}
                onChange={(e) => setField('discount_value', e.target.value)}
                style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
              />
            </label>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <label style={{fontSize:13,color:'#444'}}>Max uses (optional)
              <input
                type="number"
                min="1"
                step="1"
                value={form.usage_limit}
                onChange={(e) => setField('usage_limit', e.target.value)}
                placeholder="Leave empty for unlimited"
                style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
              />
            </label>
            <label style={{fontSize:13,color:'#444'}}>Expires at (optional)
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setField('expires_at', e.target.value)}
                style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
              />
            </label>
          </div>

          <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
            <input type="checkbox" checked={form.one_per_email} onChange={(e) => setField('one_per_email', e.target.checked)} />
            One use per customer (e.g. WELCOME codes)
          </label>

          <button
            type="submit"
            disabled={saving}
            style={{marginTop:6,background:'#111',color:'#fff',border:'none',borderRadius:999,padding:'12px 16px',fontSize:14,fontWeight:600,cursor:'pointer',opacity:saving ? 0.7 : 1}}>
            {saving ? 'Creating...' : 'Create promo code'}
          </button>
        </form>

        {loading ? (
          <p style={{fontSize:14,color:'#666'}}>Loading promo codes...</p>
        ) : (
          <>
            <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
              <button type="button" onClick={() => setStatusFilter('all')} style={{border:'1px solid #ddd',background:statusFilter === 'all' ? '#111' : '#fff',color:statusFilter === 'all' ? '#fff' : '#444',borderRadius:999,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>All</button>
              <button type="button" onClick={() => setStatusFilter('active')} style={{border:'1px solid #ddd',background:statusFilter === 'active' ? '#111' : '#fff',color:statusFilter === 'active' ? '#fff' : '#444',borderRadius:999,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>Active</button>
              <button type="button" onClick={() => setStatusFilter('expired')} style={{border:'1px solid #ddd',background:statusFilter === 'expired' ? '#111' : '#fff',color:statusFilter === 'expired' ? '#fff' : '#444',borderRadius:999,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>Expired</button>
              <button type="button" onClick={() => setStatusFilter('limit_reached')} style={{border:'1px solid #ddd',background:statusFilter === 'limit_reached' ? '#111' : '#fff',color:statusFilter === 'limit_reached' ? '#fff' : '#444',borderRadius:999,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>Limit reached</button>
              <button type="button" onClick={() => setStatusFilter('inactive')} style={{border:'1px solid #ddd',background:statusFilter === 'inactive' ? '#111' : '#fff',color:statusFilter === 'inactive' ? '#fff' : '#444',borderRadius:999,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>Inactive</button>
            </div>
            <div style={{overflowX:'auto',border:'1px solid #ecece8',borderRadius:12,background:'#fff'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:980}}>
              <thead>
                <tr style={{textAlign:'left',borderBottom:'1px solid #ecece8',background:'#fafaf8'}}>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Code</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Type</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Value</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Used / limit</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Expires</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Status</th>
                  <th style={{padding:'12px 14px',fontSize:12,color:'#666660'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const state = getPromoState(row)
                  return (
                  <tr key={row.id} style={{borderBottom:'1px solid #f2f2ef'}}>
                    <td style={{padding:'10px 14px',fontSize:13,fontWeight:600}}>{row.code}</td>
                    <td style={{padding:'10px 14px',fontSize:13,textTransform:'capitalize'}}>{row.discount_type}</td>
                    <td style={{padding:'10px 14px',fontSize:13}}>
                      {row.discount_type === 'percent'
                        ? `${Number(row.discount_value || 0)}%`
                        : row.discount_type === 'free_shipping'
                          ? 'Free shipping'
                        : `€${Number(row.discount_value || 0).toFixed(2)}`}
                    </td>
                    <td style={{padding:'10px 14px',fontSize:13}}>
                      {row.usage_limit == null
                        ? `${row.used_count || 0} / ∞`
                        : `${row.used_count || 0} / ${row.usage_limit}`}
                    </td>
                    <td style={{padding:'10px 14px',fontSize:13,color:'#666'}}>{formatDate(row.expires_at)}</td>
                    <td style={{padding:'10px 14px',fontSize:12}}>
                      <span style={{border:'1px solid #ddd',borderRadius:999,padding:'3px 8px',display:'inline-block'}}>
                        {state.isInactive ? 'Inactive' : state.limitReached ? 'Limit reached' : state.isExpired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        <button type="button" onClick={() => startEdit(row)} style={{border:'1px solid #ddd',background:'#fff',borderRadius:8,padding:'5px 8px',fontSize:12,cursor:'pointer'}}>Edit</button>
                        <button type="button" onClick={() => handleToggleActive(row)} disabled={updatingId === row.id} style={{border:'1px solid #ddd',background:'#fff',borderRadius:8,padding:'5px 8px',fontSize:12,cursor:'pointer',opacity:updatingId === row.id ? 0.6 : 1}}>
                          {row.is_active === false ? 'Activate' : 'Deactivate'}
                        </button>
                        <button type="button" onClick={() => handleDelete(row)} disabled={deletingId === row.id} style={{border:'1px solid #fecaca',background:'#fff',color:'#b91c1c',borderRadius:8,padding:'5px 8px',fontSize:12,cursor:'pointer',opacity:deletingId === row.id ? 0.6 : 1}}>
                          {deletingId === row.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{padding:'20px',textAlign:'center',fontSize:14,color:'#888'}}>No promo codes for selected filter</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </>
        )}

        {editingId && (
          <div style={{marginTop:14,background:'#fff',border:'1px solid #ecece8',borderRadius:12,padding:16}}>
            <h2 style={{fontSize:18,fontWeight:600,margin:'0 0 12px'}}>Edit promo code #{editingId}</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <label style={{fontSize:13,color:'#444'}}>Code
                <input value={editForm.code} onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{fontSize:13,color:'#444'}}>Discount type
                <select value={editForm.discount_type} onChange={(e) => setEditForm((prev) => ({ ...prev, discount_type: e.target.value }))}
                  style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,background:'#fff'}}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed (€)</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </label>
              <label style={{fontSize:13,color:'#444'}}>Discount value
                <input type="number" min="0" step="0.01"
                  value={editForm.discount_value}
                  disabled={editForm.discount_type === 'free_shipping'}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, discount_value: e.target.value }))}
                  style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{fontSize:13,color:'#444'}}>Max uses
                <input type="number" min="1" step="1"
                  value={editForm.usage_limit}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, usage_limit: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                  style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{fontSize:13,color:'#444'}}>Expires at
                <input type="datetime-local"
                  value={editForm.expires_at}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, expires_at: e.target.value }))}
                  style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer',marginTop:28}}>
                <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                Active
              </label>
              <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer',marginTop:28}}>
                <input type="checkbox" checked={editForm.one_per_email} onChange={(e) => setEditForm((prev) => ({ ...prev, one_per_email: e.target.checked }))} />
                One use per customer
              </label>
            </div>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button type="button" onClick={handleSaveEdit} disabled={updatingId === editingId}
                style={{border:'none',background:'#111',color:'#fff',borderRadius:999,padding:'10px 14px',fontSize:13,cursor:'pointer',opacity:updatingId === editingId ? 0.65 : 1}}>
                {updatingId === editingId ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" onClick={cancelEdit}
                style={{border:'1px solid #ddd',background:'#fff',color:'#444',borderRadius:999,padding:'10px 14px',fontSize:13,cursor:'pointer'}}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </AdminOnly>
  )
}
