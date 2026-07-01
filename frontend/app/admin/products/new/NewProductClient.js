'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageHeader from '../../_components/PageHeader'
import { getAdminApiUrl as getApiUrl } from '../../../lib/api'
import { buildSizeTags, SIZE_PRESET_OPTIONS } from '../../../lib/sizeOptions'

export default function NewProductClient({ inTab = false }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [createdId, setCreatedId] = useState(null)
  const [createdIds, setCreatedIds] = useState([])
  const [colorCopies, setColorCopies] = useState(1)
  const [form, setForm] = useState({
    name: '',
    name_uk: '',
    description: '',
    description_uk: '',
    material_care: '',
    material_care_uk: '',
    product_details: '',
    product_details_uk: '',
    fit_info: '',
    fit_info_uk: '',
    category: '',
    image_url: '',
    price: '0',
    compare_price: '',
    available_stock: '0',
    is_hidden: true,
    is_new: false,
    is_sale: false,
    selected_sizes: [],
    custom_sizes: '',
    order_mode: 'standard',
    order_priority: '0',
    volumetric_weight: '',
    brand_id: '',
    is_menswear: true,
    is_womenswear: true,
  })
  const [brands, setBrands] = useState([])

  useEffect(() => {
    let alive = true
    fetch(getApiUrl('/brands/admin'), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (alive) setBrands(Array.isArray(d) ? d : []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
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
        name_uk: form.name_uk.trim() || null,
        description: form.description.trim(),
        description_uk: form.description_uk.trim() || null,
        material_care: form.material_care.trim(),
        material_care_uk: form.material_care_uk.trim() || null,
        product_details: form.product_details.trim(),
        product_details_uk: form.product_details_uk.trim() || null,
        fit_info: form.fit_info.trim(),
        fit_info_uk: form.fit_info_uk.trim() || null,
        category: form.category.trim(),
        image_url: form.image_url.trim() || null,
        price: nextPrice,
        compare_price: form.is_sale ? nextComparePrice : null,
        available_stock: Math.max(0, Number(form.available_stock || 0)),
        stock: Math.max(0, Number(form.available_stock || 0)),
        reserved_stock: 0,
        is_hidden: Boolean(form.is_hidden),
        volumetric_weight: form.volumetric_weight !== '' ? Number(form.volumetric_weight) : null,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        is_menswear: Boolean(form.is_menswear),
        is_womenswear: Boolean(form.is_womenswear),
        tags: [
          form.is_new ? 'new' : null,
          form.is_sale ? 'sale' : null,
          ...buildSizeTags(form.selected_sizes, form.custom_sizes),
          ...orderTags,
        ].filter(Boolean),
      }

      if (!payload.name) throw new Error('Name is required')
      if (payload.price < 0) throw new Error('Price must be >= 0')
      if (form.is_sale) {
        if (!form.compare_price) throw new Error('Set old price for Sale')
        if (nextComparePrice <= nextPrice) throw new Error('Old price must be greater than current price')
      }
      if (form.order_mode === 'mandatory' && Number.isNaN(nextOrderPriority)) {
        throw new Error('Set mandatory order priority')
      }

      const n = Math.max(1, Math.min(20, Number(colorCopies) || 1))
      const ids = []
      for (let i = 0; i < n; i++) {
        const copyPayload = { ...payload }
        if (n > 1) {
          copyPayload.name = `${payload.name} — Color ${i + 1}`
          copyPayload.slug = undefined // let backend generate unique slug
        }
        const res = await fetch(getApiUrl('/products'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(copyPayload),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || 'Failed to create product')
        }
        const data = await res.json()
        ids.push(data.id)
      }
      setCreatedId(ids[0])
      setCreatedIds(ids)
      setMessage(n === 1 ? 'Product created' : `${n} color variants created`)
      setColorCopies(1)
      setForm({
        name: '',
        name_uk: '',
        description: '',
        description_uk: '',
        material_care: '',
        material_care_uk: '',
        product_details: '',
        product_details_uk: '',
        fit_info: '',
        fit_info_uk: '',
        category: '',
        image_url: '',
        price: '0',
        compare_price: '',
        available_stock: '0',
        is_hidden: true,
        is_new: false,
        is_sale: false,
        selected_sizes: [],
        custom_sizes: '',
        order_mode: 'standard',
        order_priority: '0',
        volumetric_weight: '',
        brand_id: '',
        is_menswear: true,
        is_womenswear: true,
      })
    } catch (e) {
      setError(e.message || 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  const inner = (
    <>
        {createdIds.length > 0 && (
          <div style={{marginBottom:12,display:'flex',flexWrap:'wrap',gap:8}}>
            {createdIds.map((pid, i) => (
              <a key={pid} href={`/admin/products/${pid}`} style={{fontSize:13,color:'#2563eb',textDecoration:'none',border:'1px solid #bfdbfe',borderRadius:8,padding:'4px 10px',background:'#eff6ff'}}>
                {createdIds.length > 1 ? `Color ${i + 1} #${pid}` : `Open product #${pid}`}
              </a>
            ))}
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

          <label style={{fontSize:13,color:'#444'}}>Material & care
            <textarea value={form.material_care} onChange={(e) => setField('material_care', e.target.value)} rows={3} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
          </label>

          <label style={{fontSize:13,color:'#444'}}>More about this product
            <textarea value={form.product_details} onChange={(e) => setField('product_details', e.target.value)} rows={3} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
          </label>

          <label style={{fontSize:13,color:'#444'}}>Fit
            <textarea value={form.fit_info} onChange={(e) => setField('fit_info', e.target.value)} rows={3} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
          </label>

          <div style={{border:'1px solid #dbeafe',borderRadius:10,padding:14,background:'#eff6ff'}}>
            <p style={{fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#2563eb',margin:'0 0 12px'}}>Українська версія</p>
            <label style={{fontSize:13,color:'#1e3a8a'}}>Назва
              <input value={form.name_uk} onChange={(e) => setField('name_uk', e.target.value)} placeholder={form.name} style={{width:'100%',marginTop:6,border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 12px',fontSize:14}} />
            </label>
            <label style={{fontSize:13,color:'#1e3a8a'}}>Опис
              <textarea value={form.description_uk} onChange={(e) => setField('description_uk', e.target.value)} rows={4} placeholder={form.description} style={{width:'100%',marginTop:6,border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
            </label>
            <label style={{fontSize:13,color:'#1e3a8a',display:'block',marginTop:10}}>Матеріал і догляд
              <textarea value={form.material_care_uk} onChange={(e) => setField('material_care_uk', e.target.value)} rows={3} placeholder={form.material_care} style={{width:'100%',marginTop:6,border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
            </label>
            <label style={{fontSize:13,color:'#1e3a8a',display:'block',marginTop:10}}>Детальніше про товар
              <textarea value={form.product_details_uk} onChange={(e) => setField('product_details_uk', e.target.value)} rows={3} placeholder={form.product_details} style={{width:'100%',marginTop:6,border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
            </label>
            <label style={{fontSize:13,color:'#1e3a8a',display:'block',marginTop:10}}>Посадка
              <textarea value={form.fit_info_uk} onChange={(e) => setField('fit_info_uk', e.target.value)} rows={3} placeholder={form.fit_info} style={{width:'100%',marginTop:6,border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 12px',fontSize:14,resize:'vertical'}} />
            </label>
            <p style={{fontSize:11,color:'#60a5fa',margin:'10px 0 0'}}>Можна заповнити пізніше: українська сторінка покаже англійський fallback.</p>
          </div>

          <label style={{fontSize:13,color:'#444'}}>Category
            <input value={form.category} onChange={(e) => setField('category', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
          </label>

          <label style={{fontSize:13,color:'#444'}}>Brand
            <select value={form.brand_id} onChange={(e) => setField('brand_id', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14,background:'#fff'}}>
              <option value="">— None (own goods) —</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}{b.is_active ? '' : ' (hidden)'}</option>)}
            </select>
          </label>

          <div style={{border:'1px solid #ecece8',borderRadius:10,padding:12,background:'#fafaf8'}}>
            <p style={{fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#888',margin:'0 0 10px'}}>Audience</p>
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={Boolean(form.is_menswear)}
                  onChange={(e) => setField('is_menswear', e.target.checked)}
                />
                Men
              </label>
              <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={Boolean(form.is_womenswear)}
                  onChange={(e) => setField('is_womenswear', e.target.checked)}
                />
                Women
              </label>
            </div>
            <p style={{fontSize:11,color:'#aaa',margin:'8px 0 0'}}>Unisex = both Men and Women checked.</p>
          </div>

          <label style={{fontSize:13,color:'#444'}}>Image URL (optional)
            <input value={form.image_url} onChange={(e) => setField('image_url', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
          </label>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <label style={{fontSize:13,color:'#444'}}>{form.is_sale ? 'Current price' : 'Price'}
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField('price', e.target.value)} style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
            </label>
            <label style={{fontSize:13,color:'#444'}}>Volumetric weight (kg)
              <input type="number" step="0.01" min="0" value={form.volumetric_weight} onChange={(e) => setField('volumetric_weight', e.target.value)} placeholder="e.g. 0.3" style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}} />
              <span style={{fontSize:11,color:'#aaa',display:'block',marginTop:3}}>L×W×H(cm) / 5000</span>
            </label>
          </div>
          <p style={{fontSize:12,color:'#aaa',margin:'0'}}>Stock is managed per-size in the <a href="/admin/inventory" style={{color:'#888'}}>Inventory</a> page after creating the product.</p>
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
            Create as hidden (draft)
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

          <div style={{border:'1px solid #ecece8',borderRadius:10,padding:12,background:'#fafaf8'}}>
            <p style={{fontSize:13,color:'#444',margin:'0 0 8px',fontWeight:600}}>Size options</p>
            <p style={{fontSize:12,color:'#777',margin:'0 0 10px'}}>
              Leave all unchecked for products without sizes (for example, scarf with no size choice).
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:8}}>
              {SIZE_PRESET_OPTIONS.map((size) => {
                const checked = form.selected_sizes.includes(size)
                return (
                  <label key={size} style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#444',cursor:'pointer'}}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setField('selected_sizes', [...form.selected_sizes, size])
                        } else {
                          setField('selected_sizes', form.selected_sizes.filter((s) => s !== size))
                        }
                      }}
                    />
                    {size}
                  </label>
                )
              })}
            </div>
            <label style={{display:'block',marginTop:10,fontSize:13,color:'#444'}}>
              Custom sizes (comma separated)
              <input
                value={form.custom_sizes}
                onChange={(e) => setField('custom_sizes', e.target.value)}
                placeholder="Petite, Tall, 32/34"
                style={{width:'100%',marginTop:6,border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
              />
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

          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6,padding:'12px 14px',background:'#f5f5f3',borderRadius:10}}>
            <label style={{fontSize:13,color:'#444',fontWeight:500,whiteSpace:'nowrap'}}>Create in</label>
            <input
              type="number" min="1" max="20" step="1"
              value={colorCopies}
              onChange={(e) => setColorCopies(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              style={{width:64,border:'1px solid #ddd',borderRadius:8,padding:'7px 10px',fontSize:14,textAlign:'center'}}
            />
            <label style={{fontSize:13,color:'#444',fontWeight:500,whiteSpace:'nowrap'}}>color variant{colorCopies > 1 ? 's' : ''}</label>
            <span style={{fontSize:12,color:'#aaa',marginLeft:4}}>
              {colorCopies > 1 ? `→ creates ${colorCopies} copies: «Name — Color 1», «Name — Color 2»…` : '→ creates 1 product'}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{marginTop:2,background:'#111',color:'#fff',border:'none',borderRadius:999,padding:'12px 16px',fontSize:14,fontWeight:600,cursor:'pointer',opacity:saving ? 0.7 : 1}}>
            {saving ? 'Creating...' : colorCopies > 1 ? `Create ${colorCopies} color variants` : 'Create product'}
          </button>
        </form>
    </>
  )

  if (inTab) return <div style={{maxWidth:760}}>{inner}</div>

  return (
    <div style={{maxWidth:760}}>
      <Link href="/admin/products" style={{fontSize:14,color:'#666',textDecoration:'none'}}>← Back to products</Link>
      <PageHeader title="Create product" />
      {inner}
    </div>
  )
}
