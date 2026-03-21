'use client'
import { useEffect, useState } from 'react'
import AdminOnly from '../../../components/AdminOnly'
import { getApiUrl } from '../../../lib/api'
import AdminTopBar from '../../../components/AdminTopBar'

export default function ProductEditorClient({ id }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    image_url: '',
    price: '0',
    available_stock: '0',
    reserved_stock: '0',
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(getApiUrl('/products/' + id), { cache: 'no-store' })
        if (!res.ok) throw new Error('Product not found')
        const p = await res.json()
        if (!mounted) return
        setProduct(p)
        setForm({
          name: p.name || '',
          description: p.description || '',
          category: p.category || '',
          image_url: p.image_url || '',
          price: String(p.price ?? 0),
          available_stock: String(p.available_stock ?? p.stock ?? 0),
          reserved_stock: String(p.reserved_stock ?? 0),
        })
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load product')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function reloadProduct() {
    const res = await fetch(getApiUrl('/products/' + id), { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to refresh product')
    const p = await res.json()
    setProduct(p)
    setForm((f) => ({ ...f, image_url: p.image_url || f.image_url }))
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
        reserved_stock: Math.max(0, Number(form.reserved_stock || 0)),
      }
      const res = await fetch(getApiUrl('/products/' + id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to save product')
      }
      await reloadProduct()
      setMessage('Product saved')
    } catch (e) {
      setError(e.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadFiles(files) {
    if (!files?.length) return
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      const res = await fetch(getApiUrl('/products/' + id + '/image'), {
        method: 'PUT',
        body: formData,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to upload images')
      }
      await reloadProduct()
      setMessage('Images uploaded')
    } catch (e) {
      setError(e.message || 'Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteImage(imageUrl) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(getApiUrl('/products/' + id + '/image'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to delete image')
      }
      await reloadProduct()
      setMessage('Image deleted')
    } catch (e) {
      setError(e.message || 'Failed to delete image')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetAsCover(imageUrl) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(getApiUrl('/products/' + id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to set cover')
      }
      await reloadProduct()
      setMessage('Cover image updated')
    } catch (e) {
      setError(e.message || 'Failed to set cover')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProduct() {
    if (!window.confirm('Delete this product permanently?')) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(getApiUrl('/products/' + id), { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to delete product')
      }
      window.location.href = '/admin/products'
    } catch (e) {
      setError(e.message || 'Failed to delete product')
      setDeleting(false)
    }
  }

  async function handleArchiveProduct() {
    if (!window.confirm('Archive this product? It will be hidden from active stock.')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(getApiUrl('/products/' + id + '/archive'), { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to archive product')
      }
      await reloadProduct()
      setMessage('Product archived')
    } catch (e) {
      setError(e.message || 'Failed to archive product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminOnly>
      <main style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 72px'}}>
        <a href="/admin/products" style={{fontSize:14,color:'#666',textDecoration:'none'}}>← Back to products</a>
        <h1 style={{fontSize:30,fontWeight:600,margin:'14px 0 18px'}}>Edit product #{id}</h1>
        <AdminTopBar active="products" />

        {loading ? (
          <p style={{color:'#888'}}>Loading product...</p>
        ) : (
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

            <label style={{fontSize:13,color:'#444'}}>Image URL (cover)
              <input value={form.image_url} onChange={(e) => setField('image_url', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
            </label>

            <div style={{border:'1px dashed #cfcfc8',borderRadius:10,padding:12,background:'#fafaf8'}}>
              <p style={{fontSize:13,color:'#444',margin:'0 0 8px'}}>Gallery upload (drag & drop or pick files)</p>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleUploadFiles(Array.from(e.dataTransfer.files || []))
                }}
                style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:72,border:'1px solid #e5e5df',borderRadius:10,background:'#fff',cursor:'pointer',fontSize:13,color:'#666'}}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{display:'none'}}
                  onChange={(e) => handleUploadFiles(Array.from(e.target.files || []))}
                />
                {uploading ? 'Uploading...' : 'Drop images here or click to select'}
              </label>
              {Array.isArray(product?.image_urls) && product.image_urls.length > 0 && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(92px, 1fr))',gap:8,marginTop:10}}>
                  {product.image_urls.map((url) => (
                    <div key={url} style={{position:'relative',aspectRatio:'3/4',borderRadius:8,overflow:'hidden',border:'1px solid #e8e8e2'}}>
                      <img src={url} alt="product" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      <button
                        type="button"
                        onClick={() => handleSetAsCover(url)}
                        style={{position:'absolute',left:4,top:4,background:'rgba(255,255,255,0.88)',color:'#111',border:'none',borderRadius:6,padding:'2px 6px',fontSize:11,cursor:'pointer'}}>
                        {product.image_url === url ? 'Cover' : 'Set cover'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(url)}
                        style={{position:'absolute',top:4,right:4,background:'rgba(17,17,17,0.8)',color:'#fff',border:'none',borderRadius:6,padding:'2px 6px',fontSize:11,cursor:'pointer'}}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <label style={{fontSize:13,color:'#444'}}>Price
                <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{fontSize:13,color:'#444'}}>Available stock
                <input type="number" min="0" value={form.available_stock} onChange={(e) => setField('available_stock', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{fontSize:13,color:'#444'}}>Reserved stock
                <input type="number" min="0" value={form.reserved_stock} onChange={(e) => setField('reserved_stock', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{marginTop:6,background:'#111',color:'#fff',border:'none',borderRadius:999,padding:'12px 16px',fontSize:14,fontWeight:600,cursor:'pointer',opacity:saving ? 0.7 : 1}}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleArchiveProduct}
              disabled={saving}
              style={{background:'#fff',color:'#92400e',border:'1px solid #fed7aa',borderRadius:999,padding:'10px 16px',fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving ? 0.7 : 1}}>
              Archive product (soft delete)
            </button>
            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={deleting}
              style={{background:'#fff',color:'#b91c1c',border:'1px solid #fecaca',borderRadius:999,padding:'10px 16px',fontSize:13,fontWeight:600,cursor:'pointer',opacity:deleting ? 0.7 : 1}}>
              {deleting ? 'Deleting...' : 'Delete product'}
            </button>
          </form>
        )}
      </main>
    </AdminOnly>
  )
}
