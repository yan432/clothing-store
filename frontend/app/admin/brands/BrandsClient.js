'use client'
import { useEffect, useState } from 'react'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'
import Card from '../_components/Card'
import Button from '../_components/Button'
import Badge from '../_components/Badge'
import { tokens } from '../_components/tokens'

const EMPTY_FORM = {
  slug: '',
  name: '',
  description: '',
  logo_url: '',
  cover_url: '',
  is_active: true,
  sort_order: 0,
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function BrandsClient() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null) // null = list, 'new' = create, number = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [usersBrand, setUsersBrand] = useState(null) // brand whose users modal is open

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(getApiUrl('/brands/admin'), { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBrands(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load brands')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startNew() {
    setEditingId('new')
    setForm(EMPTY_FORM)
  }

  function startEdit(brand) {
    setEditingId(brand.id)
    setForm({
      slug: brand.slug || '',
      name: brand.name || '',
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      cover_url: brand.cover_url || '',
      is_active: Boolean(brand.is_active),
      sort_order: Number(brand.sort_order || 0),
    })
  }

  function cancel() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  function set(key, value) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'name' && (editingId === 'new') && !prev.slug) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const body = {
        slug: form.slug || slugify(form.name),
        name: form.name,
        description: form.description || null,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
        is_active: Boolean(form.is_active),
        sort_order: Number(form.sort_order || 0),
      }
      const isCreate = editingId === 'new'
      const url = isCreate ? getApiUrl('/brands') : getApiUrl(`/brands/${editingId}`)
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      await load()
      cancel()
    } catch (e) {
      setError(e.message || 'Failed to save brand')
    } finally {
      setSaving(false)
    }
  }

  async function remove(brand) {
    if (!confirm(`Delete brand "${brand.name}"? Products keep their data but lose the brand link.`)) return
    setBusyId(brand.id)
    setError('')
    try {
      const res = await fetch(getApiUrl(`/brands/${brand.id}`), { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      await load()
    } catch (e) {
      setError(e.message || 'Failed to delete brand')
    } finally {
      setBusyId(null)
    }
  }

  if (editingId !== null) {
    return (
      <Card style={{ maxWidth: 640 }}>
        <h2 style={{ ...tokens.font.h2, marginBottom: tokens.space.lg }}>
          {editingId === 'new' ? 'New brand' : `Edit brand #${editingId}`}
        </h2>
        {error && (
          <div style={{ background: tokens.color.dangerBg, border: `1px solid ${tokens.color.dangerBorder}`, color: tokens.color.dangerText, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        <Field label="Name" value={form.name} onChange={v => set('name', v)} />
        <Field label="Slug" value={form.slug} onChange={v => set('slug', v)} hint="Internal brand handle; storefront uses brand filters." />
        <Field label="Description" value={form.description} onChange={v => set('description', v)} multiline />
        <Field label="Logo URL" value={form.logo_url} onChange={v => set('logo_url', v)} />
        <Field label="Cover URL" value={form.cover_url} onChange={v => set('cover_url', v)} />
        <Field label="Sort order" value={String(form.sort_order)} onChange={v => set('sort_order', Number(v) || 0)} type="number" />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 8, color: tokens.color.text }}>
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
          Active (visible on storefront)
        </label>
        <div style={{ display: 'flex', gap: tokens.space.sm, marginTop: tokens.space.xl }}>
          <Button variant="primary" onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" onClick={cancel}>Cancel</Button>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.space.lg }}>
        <p style={{ ...tokens.font.bodyMuted, margin: 0 }}>{loading ? 'Loading…' : `${brands.length} brand(s)`}</p>
        <Button variant="primary" onClick={startNew}>+ New brand</Button>
      </div>
      {error && (
        <div style={{ background: tokens.color.dangerBg, border: `1px solid ${tokens.color.dangerBorder}`, color: tokens.color.dangerText, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}
      <Card padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `1px solid ${tokens.color.border}`, background: tokens.color.bg }}>
              <th style={{ padding: '12px 16px', ...tokens.font.label }}>Brand</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label }}>Slug</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label }}>Status</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label }}>Sort</th>
              <th style={{ padding: '12px 16px', ...tokens.font.label, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && brands.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: tokens.color.textSubtle, fontSize: 14 }}>No brands yet. Create one to get started.</td></tr>
            )}
            {brands.map(brand => (
              <tr key={brand.id} style={{ borderBottom: `1px solid ${tokens.color.border}` }}>
                <td style={{ padding: '14px 16px', fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: tokens.color.bg, overflow: 'hidden', flexShrink: 0 }}>
                      {brand.logo_url ? <img src={brand.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{brand.name}</div>
                      {brand.description && <div style={{ ...tokens.font.bodyMuted, fontSize: 12 }}>{brand.description.slice(0, 64)}{brand.description.length > 64 ? '…' : ''}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: tokens.color.textMuted, fontFamily: 'monospace' }}>{brand.slug}</td>
                <td style={{ padding: '14px 16px' }}>
                  <Badge tone={brand.is_active ? 'success' : 'warn'}>{brand.is_active ? 'Active' : 'Hidden'}</Badge>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: tokens.color.textMuted }}>{brand.sort_order ?? 0}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 8 }}>
                    <Button size="sm" onClick={() => setUsersBrand(brand)}>Users</Button>
                    <Button size="sm" onClick={() => startEdit(brand)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(brand)} disabled={busyId === brand.id}>
                      {busyId === brand.id ? '…' : 'Delete'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {usersBrand && (
        <BrandUsersModal brand={usersBrand} onClose={() => setUsersBrand(null)} />
      )}
    </>
  )
}

function BrandUsersModal({ brand, onClose }) {
  const [users, setUsers] = useState(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [revoking, setRevoking] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    try {
      const res = await fetch(getApiUrl(`/admin/brands/${brand.id}/users`), { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      setErr(e.message || 'Failed to load users')
      setUsers([])
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [brand.id])

  async function invite() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(getApiUrl(`/admin/brands/${brand.id}/users`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, role: 'owner' }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setEmail('')
      await load()
    } catch (e) {
      setErr(e.message || 'Failed to invite')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(link) {
    if (!confirm(`Revoke access for ${link.email}?`)) return
    setRevoking(link.id)
    setErr('')
    try {
      const res = await fetch(getApiUrl(`/admin/brands/${brand.id}/users/${link.id}`), { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await load()
    } catch (e) {
      setErr(e.message || 'Failed to revoke')
    } finally {
      setRevoking(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: tokens.color.surface, borderRadius: tokens.radius.lg, padding: tokens.space.xl,
        maxWidth: 560, width: '100%', boxShadow: tokens.shadow.popup,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: tokens.space.lg }}>
          <h2 style={{ ...tokens.font.h2 }}>Brand users · {brand.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: tokens.color.textMuted }}>×</button>
        </div>

        {err && (
          <div style={{ background: tokens.color.dangerBg, border: `1px solid ${tokens.color.dangerBorder}`, color: tokens.color.dangerText, borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13 }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: tokens.space.lg }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="partner@example.com"
            style={{ flex: 1, border: `1px solid ${tokens.color.borderStrong}`, borderRadius: tokens.radius.sm, padding: '8px 10px', fontSize: 14 }}
          />
          <Button variant="primary" onClick={invite} disabled={busy || !email.trim()}>
            {busy ? '…' : 'Invite'}
          </Button>
        </div>

        <div>
          {users === null && <div style={{ color: tokens.color.textSubtle, fontSize: 13 }}>Loading…</div>}
          {users && users.length === 0 && (
            <div style={{ color: tokens.color.textSubtle, fontSize: 13 }}>No users yet. Invite by email above.</div>
          )}
          {users && users.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {users.map(u => (
                <li key={u.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: `1px solid ${tokens.color.border}`, borderRadius: tokens.radius.sm,
                  padding: '8px 12px', fontSize: 13,
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: tokens.color.text }}>{u.email}</div>
                    <div style={{ ...tokens.font.bodyMuted, fontSize: 12 }}>
                      {u.user_id ? `Claimed · ${u.role}` : `Pending · ${u.role}`}
                    </div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => revoke(u)} disabled={revoking === u.id}>
                    {revoking === u.id ? '…' : 'Revoke'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p style={{ ...tokens.font.bodyMuted, fontSize: 12, marginTop: tokens.space.lg }}>
          Pending invites are claimed automatically the first time that email signs in.
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, hint, multiline, type = 'text' }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: tokens.color.textMuted, marginBottom: 4 }}>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{ width: '100%', border: `1px solid ${tokens.color.borderStrong}`, borderRadius: tokens.radius.sm, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', border: `1px solid ${tokens.color.borderStrong}`, borderRadius: tokens.radius.sm, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}
        />
      )}
      {hint && <span style={{ display: 'block', fontSize: 11, color: tokens.color.textSubtle, marginTop: 4 }}>{hint}</span>}
    </label>
  )
}
