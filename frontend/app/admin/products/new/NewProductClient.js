'use client'
import { useState } from 'react'
import AdminOnly from '../../../components/AdminOnly'
import AdminTopBar from '../../../components/AdminTopBar'
import { getApiUrl } from '../../../lib/api'

export default function NewProductClient() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [createdId, setCreatedId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    image_url: '',
    price: '0',
    available_stock: '0',
    is_hidden: true,
  })

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        image_url: form.image_url.trim() || null,
        price: Number(form.price || 0),
        available_stock: Math.max(0, Number(form.available_stock || 0)),
        stock: Math.max(0, Number(form.available_stock || 0)),
        reserved_stock: 0,
        is_hidden: Boolean(form.is_hidden),
      }

      if (!payload.name) throw new Error('Name is required')
      if (payload.price < 0) throw new Error('Price must be >= 0')

      const res = await fetch(getApiUrl('/products'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to create product')
      }
      const data = await res.json()
      setCreatedId(data.id)
      setMessage('Product created')
      setForm({
        name: '',
        description: '',
        category: '',
        image_url: '',
        price: '0',
        available_stock: '0',
        is_hidden: true,
      })
    } catch (e) {
      setError(e.message || 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminOnly>
      <main style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 72px'}}>
        <a href="/admin/products" style={{fontSize:14,color:'#666',textDecoration:'none'}}>← Back to products</a>
        <h1 style={{fontSize:30,fontWeight:600,margin:'14px 0 18px'}}>Create product</h1>
        <AdminTopBar active="products-new" />

        {createdId && (
          <div style={{marginBottom:12}}>
            <a href={`/admin/products/${createdId}`} style={{fontSize:13,color:'#2563eb',textDecoration:'none'}}>Open created product #{createdId}</a>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12,background:'#fff',border:'1px solid #ecece8',borderRadius:12,padding:16}}>
          {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#b91c1c',borderRadius:10,padding:'10px 12px',fontSize:14}}>{error}</div>}
          {message && <div style={{background:'#ecfdf3',border:'1px solid #bbf7d0',color:'#166534',borderRadius:10,padding:'10px 12px',fontSize:14}}>{message}</div>}

          <label style={{fontSize:13,color:'#444'}}>Name
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} required style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
          </label>

          <label style={{fontSize:13,color:'#444'}}>Description
            <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={4} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
          </label>

          <label style={{fontSize:13,color:'#444'}}>Category
            <input value={form.category} onChange={(e) => setField('category', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
          </label>

          <label style={{fontSize:13,color:'#444'}}>Image URL (optional)
            <input value={form.image_url} onChange={(e) => setField('image_url', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
          </label>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <label style={{fontSize:13,color:'#444'}}>Price
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
            </label>
            <label style={{fontSize:13,color:'#444'}}>Available stock
              <input type="number" min="0" value={form.available_stock} onChange={(e) => setField('available_stock', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
            </label>
          </div>

          <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
            <input
              type="checkbox"
              checked={Boolean(form.is_hidden)}
              onChange={(e) => setField('is_hidden', e.target.checked)}
            />
            Create as hidden (draft)
          </label>

          <button
            type="submit"
            disabled={saving}
            style={{marginTop:6,background:'#111',color:'#fff',border:'none',borderRadius:999,padding:'12px 16px',fontSize:14,fontWeight:600,cursor:'pointer',opacity:saving ? 0.7 : 1}}>
            {saving ? 'Creating...' : 'Create product'}
          </button>
        </form>
      </main>
    </AdminOnly>
  )
}
