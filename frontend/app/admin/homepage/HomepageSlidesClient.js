'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'

function ProductPicker({ products, selectedIds, onChange }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 30)
    return products
      .filter(p => (p.name || '').toLowerCase().includes(q))
      .slice(0, 30)
  }, [products, query])

  function toggle(id) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id))
    else onChange([...selectedIds, id])
  }

  const selectedProducts = products.filter(p => selectedIds.includes(p.id))

  return (
    <div>
      {selectedProducts.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selectedProducts.map(p => (
            <span key={p.id} style={{
              fontSize: 11, padding: '4px 8px', borderRadius: 999,
              background: '#111', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              {p.name}
              <button type="button" onClick={() => toggle(p.id)} style={{
                background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1,
              }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search products to add..."
        style={{ border: '1px solid #ddd', borderRadius: 8, padding: '7px 10px', fontSize: 12, width: '100%', marginBottom: 6 }}
      />
      <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #ecece8', borderRadius: 8, background: '#fafaf8' }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: '#aaa', padding: 10, margin: 0 }}>No products match.</p>
        ) : filtered.map(p => {
          const isSel = selectedIds.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '6px 10px', textAlign: 'left',
                background: isSel ? '#ecfdf3' : 'transparent', border: 'none',
                borderBottom: '1px solid #f0f0ee', cursor: 'pointer', fontSize: 12,
              }}>
              <input type="checkbox" checked={isSel} readOnly style={{ pointerEvents: 'none' }} />
              {p.image_url && <img src={p.image_url} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }} />}
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ color: '#888' }}>€{p.price}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function HomepageSlidesClient() {
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null) // slide being edited
  const [editForm, setEditForm] = useState({ href: '', title: '', link_label: '' })
  const fileRef = useRef(null)
  const newHrefRef = useRef(null)
  const newTitleRef = useRef(null)
  const newLinkLabelRef = useRef(null)

  // Photo tiles state
  const [tiles, setTiles] = useState([])
  const [tilesLoading, setTilesLoading] = useState(true)
  const [tileUploading, setTileUploading] = useState(false)
  const [tileEditId, setTileEditId] = useState(null)
  const [tileEditHref, setTileEditHref] = useState('')
  const [tileEditProductIds, setTileEditProductIds] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [newTileProductIds, setNewTileProductIds] = useState([])
  const tileFileRef = useRef(null)
  const tileHrefRef = useRef(null)

  // Drop timer state
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerDate, setTimerDate]       = useState('')
  const [timerLabel, setTimerLabel]     = useState('New Drop')
  const [timerSaving, setTimerSaving]   = useState(false)

  const flash = useCallback((msg, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000) }
    else { setMessage(msg); setTimeout(() => setMessage(''), 3000) }
  }, [])

  const load = useCallback(async function loadSlides() {
    try {
      const res = await fetch(getApiUrl('/homepage-slides/admin'), { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSlides(Array.isArray(data) ? data : [])
    } catch (e) { setError(e?.message || 'Failed to load slides') }
    finally { setLoading(false) }
  }, [])

  const loadTimer = useCallback(async function loadDropTimer() {
    try {
      const res = await fetch(getApiUrl('/settings'), { cache: 'no-store' })
      if (!res.ok) {
        flash(`Failed to load timer settings (HTTP ${res.status})`, true)
        return
      }
      const raw = await res.json()
      const map = Array.isArray(raw)
        ? Object.fromEntries(raw.map(r => [r.key, r.value]))
        : (raw && typeof raw === 'object' ? raw : {})
      setTimerEnabled(map.drop_timer_enabled === 'true')
      if (map.drop_timer_date) {
        try {
          const local = new Date(map.drop_timer_date)
          if (!isNaN(local.getTime())) {
            const pad = n => String(n).padStart(2, '0')
            setTimerDate(
              `${local.getFullYear()}-${pad(local.getMonth()+1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`
            )
          }
        } catch {}
      }
      if (map.drop_timer_label) setTimerLabel(map.drop_timer_label)
    } catch (e) {
      flash(`Timer load error: ${e.message}`, true)
    }
  }, [flash])

  async function saveTimer() {
    if (timerEnabled && !timerDate) {
      flash('Set a drop date before enabling the timer', true)
      return
    }
    if (timerEnabled && timerDate && new Date(timerDate).getTime() <= Date.now()) {
      flash('Drop date must be in the future', true)
      return
    }
    setTimerSaving(true)
    try {
      const res = await fetch(getApiUrl('/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drop_timer_enabled: timerEnabled ? 'true' : 'false',
          drop_timer_date:    timerDate ? new Date(timerDate).toISOString() : '',
          drop_timer_label:   timerLabel || 'New Drop',
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body}`)
      }
      flash('Timer saved')
    } catch (e) { flash(e.message || 'Failed to save timer', true) }
    finally { setTimerSaving(false) }
  }

  const loadTiles = useCallback(async function loadPhotoTiles() {
    try {
      const res = await fetch(getApiUrl('/homepage-photo-tiles/admin'), { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTiles(Array.isArray(data) ? data : [])
    } catch (e) { flash(e?.message || 'Failed to load tiles', true) }
    finally { setTilesLoading(false) }
  }, [flash])

  const loadAllProducts = useCallback(async function loadProductsForPicker() {
    try {
      const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setAllProducts(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  async function handleTileUpload(e) {
    const raw = e.target.files?.[0]
    if (!raw) return
    setTileUploading(true)
    try {
      const file = await compressImage(raw)
      const href = tileHrefRef.current?.value.trim() || ''
      const fd = new FormData()
      fd.append('file', file)
      fd.append('href', href)
      fd.append('product_ids', newTileProductIds.join(','))
      const res = await fetch(getApiUrl('/homepage-photo-tiles/upload'), { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      flash('Photo added')
      if (tileHrefRef.current) tileHrefRef.current.value = ''
      setNewTileProductIds([])
      e.target.value = ''
      await loadTilesRefresh()
    } catch (err) { flash(err.message || 'Upload failed', true) }
    finally { setTileUploading(false) }
  }

  async function loadTilesRefresh() {
    try {
      const res = await fetch(getApiUrl('/homepage-photo-tiles/admin'), { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setTiles(Array.isArray(data) ? data : [])
    } catch {}
  }

  async function handleTileDelete(id) {
    if (!confirm('Delete this photo?')) return
    try {
      await fetch(getApiUrl('/homepage-photo-tiles/' + id), { method: 'DELETE' })
      flash('Deleted')
      await loadTilesRefresh()
    } catch { flash('Delete failed', true) }
  }

  async function handleTileToggle(tile) {
    try {
      await fetch(getApiUrl('/homepage-photo-tiles/' + tile.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tile.is_active }),
      })
      await loadTilesRefresh()
    } catch { flash('Failed', true) }
  }

  async function handleTileSaveEdit(id) {
    try {
      const res = await fetch(getApiUrl('/homepage-photo-tiles/' + id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          href: tileEditHref || null,
          product_ids: tileEditProductIds,
        }),
      })
      if (!res.ok) throw new Error()
      flash('Saved')
      setTileEditId(null)
      await loadTilesRefresh()
    } catch { flash('Save failed', true) }
  }

  async function handleTileReorder(idx, dir) {
    const next = [...tiles]
    const to = idx + dir
    if (to < 0 || to >= next.length) return
    ;[next[idx], next[to]] = [next[to], next[idx]]
    setTiles(next)
    try {
      await fetch(getApiUrl('/homepage-photo-tiles/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map(t => t.id) }),
      })
    } catch { flash('Reorder failed', true) }
  }

  useEffect(() => { load(); loadTimer(); loadTiles(); loadAllProducts() }, [load, loadTimer, loadTiles, loadAllProducts])

  // Compress image to fit Vercel's 4.5 MB serverless payload limit
  async function compressImage(file, maxPx = 1920, maxBytes = 3.5 * 1024 * 1024) {
    if (file.size <= maxBytes) return file  // already small enough
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        let quality = 0.85
        const tryBlob = () => canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          if (blob.size <= maxBytes || quality <= 0.35) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
          } else { quality -= 0.1; tryBlob() }
        }, 'image/jpeg', quality)
        tryBlob()
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  async function handleUpload(e) {
    const raw = e.target.files?.[0]
    if (!raw) return
    setUploading(true)
    setError('')
    try {
      const file = await compressImage(raw)
      const href = newHrefRef.current?.value.trim() || ''
      const title = newTitleRef.current?.value.trim() || ''
      const link_label = newLinkLabelRef.current?.value.trim() || ''
      const fd = new FormData()
      fd.append('file', file)
      fd.append('href', href)
      fd.append('title', title)
      fd.append('link_label', link_label)
      const res = await fetch(getApiUrl('/homepage-slides/upload'), { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      flash('Slide added')
      if (newHrefRef.current) newHrefRef.current.value = ''
      if (newTitleRef.current) newTitleRef.current.value = ''
      if (newLinkLabelRef.current) newLinkLabelRef.current.value = ''
      e.target.value = ''
      await load()
    } catch (err) { flash(err.message || 'Upload failed', true) }
    finally { setUploading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this slide?')) return
    try {
      await fetch(getApiUrl('/homepage-slides/' + id), { method: 'DELETE' })
      flash('Deleted')
      await load()
    } catch { flash('Delete failed', true) }
  }

  async function handleToggle(slide) {
    try {
      await fetch(getApiUrl('/homepage-slides/' + slide.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !slide.is_active }),
      })
      await load()
    } catch { flash('Failed', true) }
  }

  async function handleSaveEdit(id) {
    try {
      const res = await fetch(getApiUrl('/homepage-slides/' + id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          href: editForm.href || null,
          title: editForm.title || null,
          link_label: editForm.link_label || null,
        }),
      })
      if (!res.ok) throw new Error()
      flash('Saved')
      setEditId(null)
      await load()
    } catch { flash('Save failed', true) }
  }

  async function handleReorder(idx, dir) {
    const next = [...slides]
    const to = idx + dir
    if (to < 0 || to >= next.length) return
    ;[next[idx], next[to]] = [next[to], next[idx]]
    setSlides(next)
    try {
      await fetch(getApiUrl('/homepage-slides/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map(s => s.id) }),
      })
    } catch { flash('Reorder failed', true) }
  }

  const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%' }
  const btn = (bg, color = '#fff') => ({
    border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12,
    fontWeight: 600, cursor: 'pointer', background: bg, color,
  })

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Homepage Carousel</h1>
        <a href="/" target="_blank" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Preview site ↗</a>
      </div>

      {message && <div style={{ background: '#ecfdf3', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{message}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* ── Drop Timer ────────────────────────────────── */}
      <div style={{ border: '1px solid #ecece8', borderRadius: 14, padding: 20, background: '#fff', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: 0 }}>Drop Timer</p>
          {/* Toggle */}
          <button onClick={() => setTimerEnabled(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <div style={{
              width: 40, height: 22, borderRadius: 11,
              background: timerEnabled ? '#111' : '#ddd',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: timerEnabled ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ fontSize: 13, color: timerEnabled ? '#111' : '#aaa', fontWeight: 600 }}>
              {timerEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555' }}>
            Drop date &amp; time
            <input
              type="datetime-local"
              value={timerDate}
              onChange={e => setTimerDate(e.target.value)}
              style={{ ...inp, marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, color: '#555' }}>
            Label (shown above timer)
            <input
              value={timerLabel}
              onChange={e => setTimerLabel(e.target.value)}
              placeholder="New Drop"
              style={{ ...inp, marginTop: 4 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={saveTimer} disabled={timerSaving}
            style={{ ...btn('#111'), opacity: timerSaving ? 0.6 : 1 }}>
            {timerSaving ? 'Saving…' : 'Save timer'}
          </button>
          {/* Live status */}
          {(() => {
            const isLive = timerEnabled && timerDate && new Date(timerDate).getTime() > Date.now()
            return (
              <span style={{ fontSize: 12, fontWeight: 600, color: isLive ? '#16a34a' : '#aaa' }}>
                {isLive ? '● Visible on site' : '○ Not showing'}
              </span>
            )
          })()}
        </div>
      </div>

      {/* Upload new slide */}
      <div style={{ border: '1px solid #ecece8', borderRadius: 14, padding: 20, background: '#fff', marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 14px' }}>Add slide</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555' }}>Caption (optional)
            <input ref={newTitleRef} style={{ ...inp, marginTop: 4 }} placeholder="New Collection" />
          </label>
          <label style={{ fontSize: 12, color: '#555' }}>Link URL (optional)
            <input ref={newHrefRef} style={{ ...inp, marginTop: 4 }} placeholder="/products" />
          </label>
          <label style={{ fontSize: 12, color: '#555' }}>Button text (optional)
            <input ref={newLinkLabelRef} style={{ ...inp, marginTop: 4 }} placeholder="Shop now" />
          </label>
        </div>
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 80, border: '1.5px dashed #cfcfc8', borderRadius: 10,
          cursor: 'pointer', fontSize: 13, color: '#888', background: '#fafaf8',
        }}>
          <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileRef} onChange={handleUpload} />
          {uploading ? 'Uploading...' : '+ Click to upload photo'}
        </label>
      </div>

      {/* Slides list */}
      {loading ? <p style={{ color: '#aaa' }}>Loading...</p> : slides.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No slides yet. Add one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slides.map((slide, idx) => (
            <div key={slide.id} style={{
              border: '1px solid #ecece8', borderRadius: 14, background: '#fff',
              display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 16,
              padding: 14, alignItems: 'center',
              opacity: slide.is_active ? 1 : 0.5,
            }}>
              {/* Thumbnail */}
              <div style={{ width: 120, height: 68, borderRadius: 8, overflow: 'hidden', background: '#f5f5f3', flexShrink: 0 }}>
                <img src={slide.image_url} alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>

              {/* Info / edit */}
              <div>
                {editId === slide.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      style={inp} placeholder="Caption (optional)" />
                    <input value={editForm.href} onChange={e => setEditForm(f => ({ ...f, href: e.target.value }))}
                      style={inp} placeholder="Link URL (optional), e.g. /products" />
                    <input value={editForm.link_label} onChange={e => setEditForm(f => ({ ...f, link_label: e.target.value }))}
                      style={inp} placeholder="Button text (optional), e.g. Shop now" />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btn('#111')} onClick={() => handleSaveEdit(slide.id)}>Save</button>
                      <button style={btn('#f5f5f3', '#444')} onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px', color: '#111' }}>
                      {slide.title || <span style={{ color: '#aaa' }}>No caption</span>}
                    </p>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 2px', fontFamily: 'monospace' }}>
                      {slide.href || <span style={{ color: '#ccc' }}>No link</span>}
                    </p>
                    {slide.link_label && (
                      <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Button: "{slide.link_label}"</p>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button title="Move up" onClick={() => handleReorder(idx, -1)} disabled={idx === 0}
                    style={{ ...btn('#f5f5f3', '#444'), padding: '5px 10px', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                  <button title="Move down" onClick={() => handleReorder(idx, 1)} disabled={idx === slides.length - 1}
                    style={{ ...btn('#f5f5f3', '#444'), padding: '5px 10px', opacity: idx === slides.length - 1 ? 0.3 : 1 }}>↓</button>
                </div>
                <button onClick={() => { setEditId(slide.id); setEditForm({ href: slide.href || '', title: slide.title || '', link_label: slide.link_label || '' }) }}
                  style={btn('#f5f5f3', '#444')}>Edit</button>
                <button onClick={() => handleToggle(slide)}
                  style={btn(slide.is_active ? '#fef9e7' : '#ecfdf3', slide.is_active ? '#92400e' : '#166534')}>
                  {slide.is_active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => handleDelete(slide.id)}
                  style={btn('#fef2f2', '#b91c1c')}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Photo Tiles ───────────────────────────────── */}
      <div style={{ borderTop: '1px solid #ecece8', marginTop: 32, paddingTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Photo Tiles</h2>
          <span style={{ fontSize: 12, color: '#888' }}>4-up grid shown between countdown and carousel</span>
        </div>

        {/* Add tile */}
        <div style={{ border: '1px solid #ecece8', borderRadius: 14, padding: 20, background: '#fff', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 12px' }}>Add photo</p>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: '#555' }}>"Shop all" link URL (optional)
              <input ref={tileHrefRef} style={{ ...inp, marginTop: 4 }} placeholder="/products?special=new" />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#555', margin: '0 0 6px' }}>
              Products on this look ({newTileProductIds.length} selected)
            </p>
            <ProductPicker
              products={allProducts}
              selectedIds={newTileProductIds}
              onChange={setNewTileProductIds}
            />
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 80, border: '1.5px dashed #cfcfc8', borderRadius: 10,
            cursor: 'pointer', fontSize: 13, color: '#888', background: '#fafaf8',
          }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={tileFileRef} onChange={handleTileUpload} />
            {tileUploading ? 'Uploading...' : '+ Click to upload photo'}
          </label>
        </div>

        {/* Tiles list */}
        {tilesLoading ? <p style={{ color: '#aaa' }}>Loading...</p> : tiles.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No photos yet. Add one above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tiles.map((tile, idx) => (
              <div key={tile.id} style={{
                border: '1px solid #ecece8', borderRadius: 14, background: '#fff',
                display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 14,
                padding: 12, alignItems: 'center',
                opacity: tile.is_active ? 1 : 0.5,
              }}>
                <div style={{ width: 90, height: 112, borderRadius: 8, overflow: 'hidden', background: '#f5f5f3', flexShrink: 0 }}>
                  <img src={tile.image_url} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
                </div>

                <div>
                  {tileEditId === tile.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={tileEditHref} onChange={e => setTileEditHref(e.target.value)}
                        style={inp} placeholder='"Shop all" link URL (optional)' />
                      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                        Products in look ({tileEditProductIds.length})
                      </p>
                      <ProductPicker
                        products={allProducts}
                        selectedIds={tileEditProductIds}
                        onChange={setTileEditProductIds}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={btn('#111')} onClick={() => handleTileSaveEdit(tile.id)}>Save</button>
                        <button style={btn('#f5f5f3', '#444')} onClick={() => setTileEditId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px', fontFamily: 'monospace' }}>
                        {tile.href || <span style={{ color: '#ccc' }}>No "Shop all" link</span>}
                      </p>
                      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                        {(tile.product_ids?.length || 0)} product{(tile.product_ids?.length || 0) === 1 ? '' : 's'} in look
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button title="Move up" onClick={() => handleTileReorder(idx, -1)} disabled={idx === 0}
                      style={{ ...btn('#f5f5f3', '#444'), padding: '5px 10px', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                    <button title="Move down" onClick={() => handleTileReorder(idx, 1)} disabled={idx === tiles.length - 1}
                      style={{ ...btn('#f5f5f3', '#444'), padding: '5px 10px', opacity: idx === tiles.length - 1 ? 0.3 : 1 }}>↓</button>
                  </div>
                  <button onClick={() => {
                    setTileEditId(tile.id)
                    setTileEditHref(tile.href || '')
                    setTileEditProductIds(Array.isArray(tile.product_ids) ? tile.product_ids : [])
                  }} style={btn('#f5f5f3', '#444')}>Edit</button>
                  <button onClick={() => handleTileToggle(tile)}
                    style={btn(tile.is_active ? '#fef9e7' : '#ecfdf3', tile.is_active ? '#92400e' : '#166534')}>
                    {tile.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => handleTileDelete(tile.id)}
                    style={btn('#fef2f2', '#b91c1c')}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
