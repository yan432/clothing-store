'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'

async function compressImage(file, maxPx = 1600, maxBytes = 3.5 * 1024 * 1024) {
  if (file.size <= maxBytes) return file
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (Math.max(width, height) > maxPx) {
        const ratio = maxPx / Math.max(width, height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
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

const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%' }
const btn = (bg, color = '#fff') => ({
  border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12,
  fontWeight: 600, cursor: 'pointer', background: bg, color,
})

export default function InstagramPostsClient() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ permalink: '', caption: '', author_handle: '' })

  const fileRef = useRef(null)
  const permalinkRef = useRef(null)
  const handleRef = useRef(null)
  const captionRef = useRef(null)

  const flash = useCallback((msg, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 4000) }
    else { setMessage(msg); setTimeout(() => setMessage(''), 3000) }
  }, [])

  const load = useCallback(async function loadPosts() {
    try {
      const res = await fetch(getApiUrl('/instagram-posts/admin'), { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch (e) { flash(e?.message || 'Failed to load posts', true) }
    finally { setLoading(false) }
  }, [flash])

  useEffect(() => { load() }, [load])

  async function handleUpload(e) {
    const raw = e.target.files?.[0]
    if (!raw) return
    setUploading(true)
    try {
      const file = await compressImage(raw)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('permalink', permalinkRef.current?.value.trim() || '')
      fd.append('author_handle', handleRef.current?.value.trim() || '')
      fd.append('caption', captionRef.current?.value.trim() || '')
      const res = await fetch(getApiUrl('/instagram-posts/upload'), { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      flash('Post added')
      if (permalinkRef.current) permalinkRef.current.value = ''
      if (handleRef.current) handleRef.current.value = ''
      if (captionRef.current) captionRef.current.value = ''
      e.target.value = ''
      await load()
    } catch (err) { flash(err.message || 'Upload failed', true) }
    finally { setUploading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this post?')) return
    try {
      await fetch(getApiUrl('/instagram-posts/' + id), { method: 'DELETE' })
      flash('Deleted')
      await load()
    } catch { flash('Delete failed', true) }
  }

  async function handleToggle(post) {
    try {
      await fetch(getApiUrl('/instagram-posts/' + post.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !post.is_active }),
      })
      await load()
    } catch { flash('Failed', true) }
  }

  async function handleSaveEdit(id) {
    try {
      const res = await fetch(getApiUrl('/instagram-posts/' + id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permalink: editForm.permalink || null,
          caption: editForm.caption || null,
          author_handle: editForm.author_handle || null,
        }),
      })
      if (!res.ok) throw new Error()
      flash('Saved')
      setEditId(null)
      await load()
    } catch { flash('Save failed', true) }
  }

  async function handleReorder(idx, dir) {
    const next = [...posts]
    const to = idx + dir
    if (to < 0 || to >= next.length) return
    ;[next[idx], next[to]] = [next[to], next[idx]]
    setPosts(next)
    try {
      await fetch(getApiUrl('/instagram-posts/reorder'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map(p => p.id) }),
      })
    } catch { flash('Reorder failed', true) }
  }

  return (
    <div style={{ borderTop: '1px solid #ecece8', marginTop: 32, paddingTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Instagram wall</h2>
        <span style={{ fontSize: 12, color: '#888' }}>Curated UGC under New Arrivals</span>
      </div>

      {message && <div style={{ background: '#ecfdf3', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{message}</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Add post */}
      <div style={{ border: '1px solid #ecece8', borderRadius: 14, padding: 20, background: '#fff', marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 12px' }}>Add post</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: '#555' }}>Instagram post URL
            <input ref={permalinkRef} style={{ ...inp, marginTop: 4 }} placeholder="https://www.instagram.com/p/..." />
          </label>
          <label style={{ fontSize: 12, color: '#555' }}>Author handle (without @)
            <input ref={handleRef} style={{ ...inp, marginTop: 4 }} placeholder="customer.handle" />
          </label>
        </div>
        <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 12 }}>Caption / alt text (optional)
          <input ref={captionRef} style={{ ...inp, marginTop: 4 }} placeholder="What's in the photo (for screen readers)" />
        </label>
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 80, border: '1.5px dashed #cfcfc8', borderRadius: 10,
          cursor: 'pointer', fontSize: 13, color: '#888', background: '#fafaf8',
        }}>
          <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileRef} onChange={handleUpload} />
          {uploading ? 'Uploading...' : '+ Click to upload photo'}
        </label>
      </div>

      {/* Posts list */}
      {loading ? <p style={{ color: '#aaa' }}>Loading...</p> : posts.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No posts yet. Add one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map((post, idx) => (
            <div key={post.id} style={{
              border: '1px solid #ecece8', borderRadius: 14, background: '#fff',
              display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 14,
              padding: 12, alignItems: 'center',
              opacity: post.is_active ? 1 : 0.5,
            }}>
              <div style={{ width: 90, height: 90, borderRadius: 8, overflow: 'hidden', background: '#f5f5f3', flexShrink: 0 }}>
                <img src={post.image_url} alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>

              <div>
                {editId === post.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={editForm.permalink} onChange={e => setEditForm(f => ({ ...f, permalink: e.target.value }))}
                      style={inp} placeholder="Instagram post URL" />
                    <input value={editForm.author_handle} onChange={e => setEditForm(f => ({ ...f, author_handle: e.target.value }))}
                      style={inp} placeholder="Author handle (without @)" />
                    <input value={editForm.caption} onChange={e => setEditForm(f => ({ ...f, caption: e.target.value }))}
                      style={inp} placeholder="Caption / alt text" />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btn('#111')} onClick={() => handleSaveEdit(post.id)}>Save</button>
                      <button style={btn('#f5f5f3', '#444')} onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px', color: '#111' }}>
                      {post.author_handle ? `@${post.author_handle}` : <span style={{ color: '#aaa' }}>No handle</span>}
                    </p>
                    <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.permalink || <span style={{ color: '#ccc' }}>No link</span>}
                    </p>
                    {post.caption && (
                      <p style={{ fontSize: 12, color: '#666', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.caption}</p>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button title="Move up" onClick={() => handleReorder(idx, -1)} disabled={idx === 0}
                    style={{ ...btn('#f5f5f3', '#444'), padding: '5px 10px', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                  <button title="Move down" onClick={() => handleReorder(idx, 1)} disabled={idx === posts.length - 1}
                    style={{ ...btn('#f5f5f3', '#444'), padding: '5px 10px', opacity: idx === posts.length - 1 ? 0.3 : 1 }}>↓</button>
                </div>
                <button onClick={() => {
                  setEditId(post.id)
                  setEditForm({
                    permalink: post.permalink || '',
                    caption: post.caption || '',
                    author_handle: post.author_handle || '',
                  })
                }} style={btn('#f5f5f3', '#444')}>Edit</button>
                <button onClick={() => handleToggle(post)}
                  style={btn(post.is_active ? '#fef9e7' : '#ecfdf3', post.is_active ? '#92400e' : '#166534')}>
                  {post.is_active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => handleDelete(post.id)}
                  style={btn('#fef2f2', '#b91c1c')}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
