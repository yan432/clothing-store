'use client'
import { useEffect, useState } from 'react'
import AdminOnly from '../../../components/AdminOnly'
import { getApiUrl } from '../../../lib/api'
import AdminTopBar from '../../../components/AdminTopBar'

export default function ProductEditorClient({ id }) {
  const MANAGED_TAG_PREFIXES = ['new', 'sale', 'order:fixed', 'order:random', 'order:priority:']
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [product, setProduct] = useState(null)
  const [baseTags, setBaseTags] = useState([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    image_url: '',
    price: '0',
    compare_price: '',
    available_stock: '0',
    reserved_stock: '0',
    is_hidden: false,
    is_new: false,
    is_sale: false,
    order_mode: 'standard',
    order_priority: '0',
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(getApiUrl('/products/admin/' + id), { cache: 'no-store' })
        if (!res.ok) throw new Error('Product not found')
        const p = await res.json()
        if (!mounted) return
        setProduct(p)
        const tags = Array.isArray(p.tags) ? p.tags : []
        const cleanedBaseTags = tags.filter((tag) => (
          !MANAGED_TAG_PREFIXES.some((prefix) => (
            prefix.endsWith(':') ? String(tag).startsWith(prefix) : tag === prefix
          ))
        ))
        const priorityTag = tags.find((tag) => String(tag).startsWith('order:priority:'))
        const parsedPriority = priorityTag ? Number(String(priorityTag).split('order:priority:')[1]) : 0
        const orderMode = tags.includes('order:fixed')
          ? 'mandatory'
          : tags.includes('order:random')
            ? 'random'
            : 'standard'
        const hasCompareSale = Number(p.compare_price || 0) > Number(p.price || 0)
        setBaseTags(cleanedBaseTags)
        setForm({
          name: p.name || '',
          description: p.description || '',
          category: p.category || '',
          image_url: p.image_url || '',
          price: String(p.price ?? 0),
          compare_price: p.compare_price != null ? String(p.compare_price) : '',
          available_stock: String(p.available_stock ?? p.stock ?? 0),
          reserved_stock: String(p.reserved_stock ?? 0),
          is_hidden: Boolean(p.is_hidden),
          is_new: tags.includes('new'),
          is_sale: tags.includes('sale') || hasCompareSale,
          order_mode: orderMode,
          order_priority: String(Number.isFinite(parsedPriority) ? parsedPriority : 0),
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
        const res = await fetch(getApiUrl('/products/admin/' + id), { cache: 'no-store' })
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
      const nextPrice = Number(form.price || 0)
      const nextComparePrice = Number(form.compare_price || 0)
      const nextOrderPriority = Math.max(0, Number(form.order_priority || 0))
      const orderTags = form.order_mode === 'mandatory'
        ? ['order:fixed', `order:priority:${nextOrderPriority}`]
        : form.order_mode === 'random'
          ? ['order:random']
          : []
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        image_url: form.image_url.trim() || null,
        price: nextPrice,
        compare_price: form.is_sale ? nextComparePrice : null,
        available_stock: Math.max(0, Number(form.available_stock || 0)),
        reserved_stock: Math.max(0, Number(form.reserved_stock || 0)),
        is_hidden: Boolean(form.is_hidden),
        tags: [
          ...baseTags,
          form.is_new ? 'new' : null,
          form.is_sale ? 'sale' : null,
          ...orderTags,
        ].filter(Boolean),
      }
      if (payload.price < 0) throw new Error('Price must be >= 0')
      if (form.is_sale) {
        if (!form.compare_price) throw new Error('Set old price for Sale')
        if (nextComparePrice <= nextPrice) throw new Error('Old price must be greater than current price')
      }
      if (form.order_mode === 'mandatory' && Number.isNaN(nextOrderPriority)) {
        throw new Error('Set mandatory order priority')
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
              <label style={{fontSize:13,color:'#444'}}>{form.is_sale ? 'Current price' : 'Price'}
                <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{fontSize:13,color:'#444'}}>Available stock
                <input type="number" min="0" value={form.available_stock} onChange={(e) => setField('available_stock', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
              <label style={{fontSize:13,color:'#444'}}>Reserved stock
                <input type="number" min="0" value={form.reserved_stock} onChange={(e) => setField('reserved_stock', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
            </div>
            {form.is_sale && (
              <label style={{fontSize:13,color:'#444'}}>Old price (before discount)
                <input type="number" step="0.01" min="0" value={form.compare_price} onChange={(e) => setField('compare_price', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              </label>
            )}

            <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
              <input
                type="checkbox"
                checked={Boolean(form.is_hidden)}
                onChange={(e) => setField('is_hidden', e.target.checked)}
              />
              Hidden (not visible in storefront)
            </label>
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={Boolean(form.is_new)}
                  onChange={(e) => setField('is_new', e.target.checked)}
                />
                Label as New
              </label>
              <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={Boolean(form.is_sale)}
                  onChange={(e) => setField('is_sale', e.target.checked)}
                />
                Label as Sale
              </label>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <label style={{fontSize:13,color:'#444'}}>Default listing order
                <select
                  value={form.order_mode}
                  onChange={(e) => setField('order_mode', e.target.value)}
                  style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,background:'#fff'}}
                >
                  <option value="standard">Standard</option>
                  <option value="mandatory">Mandatory position</option>
                  <option value="random">Random rotation</option>
                </select>
              </label>
              {form.order_mode === 'mandatory' && (
                <label style={{fontSize:13,color:'#444'}}>Mandatory priority (lower first)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.order_priority}
                    onChange={(e) => setField('order_priority', e.target.value)}
                    style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
                  />
                </label>
              )}
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
