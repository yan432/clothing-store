'use client'
import { useEffect, useState } from 'react'
import { getApiUrl } from '../../lib/api'
import { parseSizeOptionsFromTags, SIZE_PRESET_OPTIONS } from '../../lib/sizeOptions'

const btn = (label, onClick, opts = {}) => (
  <button onClick={onClick} style={{
    border: '1px solid #e5e5e0', borderRadius: 8, padding: '7px 14px',
    fontSize: 13, cursor: 'pointer',
    background: opts.primary ? '#0a0a0a' : '#fff',
    color: opts.primary ? '#fff' : '#333',
    fontWeight: opts.primary ? 600 : 400,
    opacity: opts.disabled ? 0.5 : 1,
    pointerEvents: opts.disabled ? 'none' : 'auto',
    ...opts.style,
  }}>{label}</button>
)

export default function InventoryClient() {
  const [products, setProducts] = useState([])
  const [draft, setDraft] = useState({}) // { productId: { size: stock } }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(getApiUrl('/admin/inventory'))
      .then(r => r.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : [])
        // Init draft from loaded size_stock
        const d = {}
        for (const p of (Array.isArray(data) ? data : [])) {
          d[p.id] = { ...p.size_stock }
        }
        setDraft(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const setStock = (productId, size, val) => {
    setDraft(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [size]: val === '' ? '' : Math.max(0, Number(val) || 0) },
    }))
  }

  const save = async () => {
    setSaving(true); setSaved(false)
    const updates = []
    for (const [productId, sizes] of Object.entries(draft)) {
      for (const [size, stock] of Object.entries(sizes)) {
        if (stock !== '' && stock !== undefined) {
          updates.push({ product_id: Number(productId), size, stock: Number(stock) || 0 })
        }
      }
    }
    await fetch(getApiUrl('/admin/inventory'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p style={{ color: '#aaa', fontSize: 14 }}>Loading…</p>

  // All distinct sizes across all products (preserving order from SIZE_PRESET_OPTIONS)
  const allSizeSets = products.map(p => new Set(parseSizeOptionsFromTags(p.tags)))
  const orderedSizes = SIZE_PRESET_OPTIONS.filter(s => allSizeSets.some(set => set.has(s)))
  const extraSizes = [...new Set(products.flatMap(p => parseSizeOptionsFromTags(p.tags)))].filter(s => !SIZE_PRESET_OPTIONS.includes(s))
  const allSizes = [...orderedSizes, ...extraSizes]

  // Products that have at least one size configured
  const productsWithSizes = products.filter(p => parseSizeOptionsFromTags(p.tags).length > 0)
  const productsNoSizes = products.filter(p => parseSizeOptionsFromTags(p.tags).length === 0)

  const stockColor = (val) => {
    if (val === '' || val === undefined || val === null) return '#e5e5e0'
    const n = Number(val)
    if (n === 0) return '#fecaca'
    if (n === 1) return '#fed7aa'
    if (n === 2) return '#fef08a'
    return '#bbf7d0'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            {productsWithSizes.length} products with sizes · cell color: <span style={{ color: '#ef4444' }}>0 = sold out</span>, <span style={{ color: '#f59e0b' }}>1 = last</span>, <span style={{ color: '#ca8a04' }}>2 = low</span>, <span style={{ color: '#16a34a' }}>3+ = ok</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: '#15803d' }}>✓ Saved</span>}
          {btn(saving ? 'Saving…' : 'Save all', save, { primary: true, disabled: saving })}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 12px', background: '#f9f9f7', border: '1px solid #e5e5e0', minWidth: 200, position: 'sticky', left: 0, zIndex: 1 }}>
                Product
              </th>
              {allSizes.map(size => (
                <th key={size} style={{ padding: '10px 12px', background: '#f9f9f7', border: '1px solid #e5e5e0', textAlign: 'center', minWidth: 72 }}>
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productsWithSizes.map(p => {
              const productSizes = new Set(parseSizeOptionsFromTags(p.tags))
              return (
                <tr key={p.id}>
                  <td style={{ padding: '8px 12px', border: '1px solid #e5e5e0', background: '#fff', fontWeight: 500, position: 'sticky', left: 0, zIndex: 1, maxWidth: 260 }}>
                    <a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#111', textDecoration: 'none', fontSize: 13 }}>
                      {p.name}
                    </a>
                  </td>
                  {allSizes.map(size => {
                    const hasSize = productSizes.has(size)
                    const val = draft[p.id]?.[size]
                    return (
                      <td key={size} style={{ padding: 4, border: '1px solid #e5e5e0', textAlign: 'center' }}>
                        {hasSize ? (
                          <input
                            type="number"
                            min={0}
                            value={val ?? ''}
                            onChange={e => setStock(p.id, size, e.target.value)}
                            placeholder="—"
                            style={{
                              width: 56,
                              textAlign: 'center',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 4px',
                              fontSize: 13,
                              background: stockColor(val),
                              outline: 'none',
                              fontWeight: 500,
                            }}
                          />
                        ) : (
                          <span style={{ color: '#ddd', fontSize: 16 }}>—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {productsNoSizes.length > 0 && (
        <p style={{ fontSize: 13, color: '#aaa', marginTop: 20 }}>
          {productsNoSizes.length} product(s) have no sizes configured and are not shown above.
        </p>
      )}
    </div>
  )
}
