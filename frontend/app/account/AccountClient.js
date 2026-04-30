'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'
import FaqAccordion from '../components/FaqAccordion'

const COUNTRIES = [
  ['AF','Afghanistan'],['AL','Albania'],['DZ','Algeria'],['AD','Andorra'],
  ['AR','Argentina'],['AM','Armenia'],['AU','Australia'],['AT','Austria'],
  ['AZ','Azerbaijan'],['BE','Belgium'],['BA','Bosnia and Herzegovina'],
  ['BR','Brazil'],['BG','Bulgaria'],['CA','Canada'],['HR','Croatia'],
  ['CY','Cyprus'],['CZ','Czech Republic'],['DK','Denmark'],['EE','Estonia'],
  ['FI','Finland'],['FR','France'],['GE','Georgia'],['DE','Germany'],
  ['GR','Greece'],['HU','Hungary'],['IS','Iceland'],['IE','Ireland'],
  ['IT','Italy'],['JP','Japan'],['LV','Latvia'],['LT','Lithuania'],
  ['LU','Luxembourg'],['MT','Malta'],['MD','Moldova'],['MC','Monaco'],
  ['ME','Montenegro'],['NL','Netherlands'],['NZ','New Zealand'],['NO','Norway'],
  ['PL','Poland'],['PT','Portugal'],['RO','Romania'],['RS','Serbia'],
  ['SK','Slovakia'],['SI','Slovenia'],['ES','Spain'],['SE','Sweden'],
  ['CH','Switzerland'],['TR','Turkey'],['UA','Ukraine'],
  ['GB','United Kingdom'],['US','United States'],
]

// ── Shared ────────────────────────────────────────────────────────────────────
const inp = (err, readOnly = false) => ({
  display: 'block', padding: '11px 14px', borderRadius: 10, fontSize: 14, outline: 'none',
  width: '100%', height: 44, boxSizing: 'border-box',
  border: err ? '1.5px solid #ef4444' : '1px solid #e5e5e3',
  background: readOnly ? '#fafaf8' : '#fff',
  color: '#111',
})

function MsgBox({ ok, text }) {
  if (!text) return null
  return (
    <div style={{
      borderRadius: 10, padding: '10px 14px', fontSize: 13, marginTop: 10,
      background: ok ? '#ecfdf3' : '#fef2f2',
      border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
      color: ok ? '#166534' : '#b91c1c',
    }}>{text}</div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="section-card" style={{ border: '1px solid #ecece8', borderRadius: 14, padding: '22px 24px', background: '#fff' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', margin: '0 0 18px' }}>{title}</p>
      {children}
    </div>
  )
}

function SaveBtn({ onClick, loading, label = 'Save' }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ marginTop: 16, padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1 }}>
      {loading ? 'Saving...' : label}
    </button>
  )
}

// ── Personal info section ─────────────────────────────────────────────────────
const EMPTY_FORM = { first_name: '', last_name: '', phone: '', address: '', city: '', zip: '', country: 'DE' }

function InfoSection({ user }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [snapshot, setSnapshot] = useState(EMPTY_FORM) // restored on cancel
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!user?.email) return
    async function load() {
      // 1. Try saved profile first
      try {
        const r = await fetch(`${getApiUrl('/user-profile')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
        const d = await r.json()
        if (d?.first_name || d?.address) {
          const merged = { ...EMPTY_FORM, ...d }
          setForm(merged); setSnapshot(merged)
          setLoading(false); return
        }
      } catch {}
      // 2. Pre-fill from most recent order if profile is empty
      try {
        const r = await fetch(getApiUrl('/orders/track'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }), cache: 'no-store' })
        if (r.ok) {
          const orders = await r.json()
          if (orders.length > 0) {
            const o = orders[0]
            const parts = (o.shipping_name || '').trim().split(' ')
            const merged = { ...EMPTY_FORM,
              first_name: o.first_name || parts[0] || '',
              last_name:  o.last_name  || parts.slice(1).join(' ') || '',
              phone:      o.phone || '',
              address:    o.shipping_line1 || '',
              city:       o.shipping_city  || '',
              zip:        o.shipping_postal_code || '',
              country:    o.shipping_country || 'DE',
            }
            setForm(merged); setSnapshot(merged)
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [user?.email])

  function startEdit() { setSnapshot({ ...form }); setEditing(true); setMsg(null) }
  function cancelEdit() { setForm({ ...snapshot }); setEditing(false); setMsg(null) }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(getApiUrl('/user-profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...form }),
      })
      if (!res.ok) throw new Error()
      setSnapshot({ ...form })
      setEditing(false)
      setMsg({ ok: true, text: 'Details saved' })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: 'Failed to save' }) }
    setSaving(false)
  }

  const ro = !editing // readOnly shorthand

  if (loading) return <SectionCard title="Personal info"><p style={{ color: '#aaa', fontSize: 14 }}>Loading...</p></SectionCard>

  return (
    <SectionCard title="Personal info">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500 }}>
        <div className="account-2col">
          <input readOnly={ro} placeholder="First name" value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} style={inp(false, ro)} />
          <input readOnly={ro} placeholder="Last name"  value={form.last_name  || ''} onChange={e => set('last_name',  e.target.value)} style={inp(false, ro)} />
        </div>
        <input readOnly={ro} placeholder="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} style={inp(false, ro)} />
        <input readOnly={ro} placeholder="Street address" value={form.address || ''} onChange={e => set('address', e.target.value)} style={inp(false, ro)} />
        <div className="account-2col">
          <input readOnly={ro} placeholder="City" value={form.city || ''} onChange={e => set('city', e.target.value)} style={inp(false, ro)} />
          <input readOnly={ro} placeholder="ZIP / Postal code" value={form.zip || ''} onChange={e => set('zip', e.target.value)} style={inp(false, ro)} />
        </div>
        <div style={{ position: 'relative' }}>
          <select
            disabled={ro}
            value={form.country || 'DE'}
            onChange={e => set('country', e.target.value)}
            style={{ ...inp(false, ro), appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, cursor: ro ? 'default' : 'pointer' }}
          >
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
          <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#aaa' }} width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1L6 7L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {msg && <MsgBox ok={msg.ok} text={msg.text} />}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {editing ? (
          <>
            <button onClick={save} disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.65 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={cancelEdit} disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 400, border: '1px solid #e5e5e3', background: '#fff', color: '#666', cursor: 'pointer' }}>
              Cancel
            </button>
          </>
        ) : (
          <button onClick={startEdit}
            style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: '1px solid #e5e5e3', background: '#fff', color: '#111', cursor: 'pointer' }}>
            Edit
          </button>
        )}
      </div>
    </SectionCard>
  )
}

// ── Security section ──────────────────────────────────────────────────────────
function SecuritySection({ user, updatePassword, updateEmail, reauthenticate, requestPasswordReset }) {
  const [pw, setPw] = useState({ old: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [pwLoading, setPwLoading] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const checks = [
    { label: 'At least 8 characters', ok: pw.next.length >= 8 },
    { label: 'One lowercase letter',  ok: /[a-z]/.test(pw.next) },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(pw.next) },
    { label: 'One number',            ok: /\d/.test(pw.next) },
  ]

  async function changePassword() {
    setPwMsg(null)
    if (!pw.old) { setPwMsg({ ok: false, text: 'Enter your current password' }); return }
    if (!checks.every(c => c.ok)) { setPwMsg({ ok: false, text: 'New password does not meet requirements' }); return }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return }
    setPwLoading(true)
    const { error: reErr } = await reauthenticate(user.email, pw.old)
    if (reErr) { setPwMsg({ ok: false, text: 'Current password is incorrect' }); setPwLoading(false); return }
    const { error } = await updatePassword(pw.next)
    if (error) setPwMsg({ ok: false, text: error.message })
    else { setPwMsg({ ok: true, text: 'Password updated' }); setPw({ old: '', next: '', confirm: '' }) }
    setPwLoading(false)
  }

  async function sendReset() {
    setPwLoading(true); setPwMsg(null)
    const { error } = await requestPasswordReset(user.email)
    setPwMsg(error ? { ok: false, text: error.message } : { ok: true, text: `Reset link sent to ${user.email}` })
    setPwLoading(false)
  }

  async function changeEmail() {
    setEmailMsg(null)
    const val = newEmail.trim()
    if (!val || !val.includes('@')) { setEmailMsg({ ok: false, text: 'Enter a valid email' }); return }
    if (val.toLowerCase() === user?.email?.toLowerCase()) { setEmailMsg({ ok: false, text: 'This is already your current email' }); return }
    setEmailLoading(true)
    const { error } = await updateEmail(val)
    if (error) setEmailMsg({ ok: false, text: error.message })
    else setEmailMsg({ ok: true, text: 'Confirmation sent. Click the link in your new inbox to confirm the change.' })
    setEmailLoading(false)
  }

  return (
    <SectionCard title="Security">
      {/* Password */}
      <div style={{ maxWidth: 420 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px', color: '#555' }}>Change password</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} placeholder="Current password"
              value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))}
              style={{ ...inp(), paddingRight: 64 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer' }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          <input type={showPw ? 'text' : 'password'} placeholder="New password"
            value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} style={inp()} />
          {pw.next && (
            <div style={{ border: '1px solid #ecece8', borderRadius: 8, padding: '8px 12px', fontSize: 12, background: '#fafaf8' }}>
              {checks.map((c, i) => (
                <p key={i} style={{ margin: '2px 0', color: c.ok ? '#15803d' : '#aaa' }}>{c.ok ? '✓' : '·'} {c.label}</p>
              ))}
            </div>
          )}
          <input type={showPw ? 'text' : 'password'} placeholder="Confirm new password"
            value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} style={inp()} />
        </div>
        {pwMsg && <MsgBox ok={pwMsg.ok} text={pwMsg.text} />}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <button onClick={changePassword} disabled={pwLoading}
            style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: pwLoading ? 'default' : 'pointer', opacity: pwLoading ? 0.65 : 1 }}>
            {pwLoading ? 'Saving...' : 'Update password'}
          </button>
          <button onClick={sendReset} disabled={pwLoading}
            style={{ background: 'none', border: 'none', fontSize: 13, color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
            Forgot? Reset via email
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: '#ecece8', margin: '24px 0' }} />

      {/* Email */}
      <div style={{ maxWidth: 420 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px', color: '#555' }}>Change email</p>
        <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 10px' }}>Current: <strong style={{ color: '#111' }}>{user?.email}</strong></p>
        <input type="email" placeholder="New email address"
          value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inp()} />
        {emailMsg && <MsgBox ok={emailMsg.ok} text={emailMsg.text} />}
        <button onClick={changeEmail} disabled={emailLoading}
          style={{ marginTop: 14, padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: emailLoading ? 'default' : 'pointer', opacity: emailLoading ? 0.65 : 1 }}>
          {emailLoading ? 'Sending...' : 'Send confirmation'}
        </button>
      </div>
    </SectionCard>
  )
}

// ── Newsletter section ────────────────────────────────────────────────────────
function NewsletterSection({ user }) {
  const [subscribed, setSubscribed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!user?.email) return
    fetch(`${getApiUrl('/email-subscribers/status')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setSubscribed(d.subscribed))
      .catch(() => setSubscribed(false))
  }, [user?.email])

  async function subscribe() {
    setLoading(true); setMsg(null)
    try {
      const res = await fetch(getApiUrl('/email-subscribers/capture'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, source: 'account_settings' }),
      })
      if (!res.ok) throw new Error()
      setSubscribed(true)
      setMsg({ ok: true, text: 'You\'re now subscribed!' })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: 'Failed to subscribe. Please try again.' }) }
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true); setMsg(null)
    try {
      const res = await fetch(getApiUrl('/email-subscribers/unsubscribe'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      if (!res.ok) throw new Error()
      setSubscribed(false)
      setMsg({ ok: true, text: 'Unsubscribed' })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: 'Failed to unsubscribe. Please try again.' }) }
    setLoading(false)
  }

  return (
    <SectionCard title="Newsletter">
      {subscribed === null ? (
        <p style={{ fontSize: 14, color: '#aaa' }}>Loading...</p>
      ) : subscribed ? (
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>You're subscribed to the newsletter</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>You receive news and exclusive offers from edm.clothes</p>
          <button onClick={unsubscribe} disabled={loading}
            style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#aaa', textDecoration: 'underline', cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Unsubscribing...' : 'Unsubscribe'}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#555' }}>Subscribe to receive news and exclusive offers from edm.clothes</p>
          <button onClick={subscribe} disabled={loading}
            style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1 }}>
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>
      )}
      {msg && <MsgBox ok={msg.ok} text={msg.text} />}
    </SectionCard>
  )
}

// ── Orders section ────────────────────────────────────────────────────────────
function formatDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? '-' : d.toLocaleString()
}
function formatMoney(v, cur = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (cur || 'eur').toUpperCase() }).format(Number(v || 0))
}
function formatItem(item) {
  const name = item?.name || 'Item'
  const qty  = Math.max(1, Number(item?.quantity || 1))
  const size = String(item?.size || '').trim()
  return `${name}${size ? ` (${size})` : ''} ×${qty}`
}

const FIT_OPTIONS = [
  { value: 'perfect',  emoji: '👌', label: 'Fits perfect' },
  { value: 'too_small', emoji: '↓',  label: 'Too small' },
  { value: 'too_big',   emoji: '↑',  label: 'Too big' },
]
const FIT_LABELS = { perfect: '👌 Fits perfect', too_small: '↓ Too small', too_big: '↑ Too big' }

function FitFeedback({ orderId, userEmail, existingFit }) {
  const [fit, setFit]       = useState(existingFit || null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(!!existingFit)

  async function submitFit(value) {
    setSaving(true)
    try {
      const res = await fetch(getApiUrl(`/orders/${orderId}/fit-feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fit: value, email: userEmail }),
      })
      if (res.ok) { setFit(value); setSaved(true) }
    } finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 12, padding: '12px 14px', background: '#f7f7f5', borderRadius: 10 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#666', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Did the size fit?
      </p>
      {saved ? (
        <p style={{ margin: 0, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
          ✓ Thanks for your feedback — {FIT_LABELS[fit]}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FIT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => submitFit(opt.value)}
              disabled={saving}
              style={{
                border: '1px solid #ddd', borderRadius: 8,
                padding: '6px 14px', fontSize: 13,
                background: '#fff', cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span>{opt.emoji}</span> {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function orderStatusBadge(status) {
  if (status === 'paid')           return { label: 'Paid',       bg: '#dcfce7', color: '#166534' }
  if (status === 'shipped')        return { label: 'Shipped',    bg: '#dbeafe', color: '#1d4ed8' }
  if (status === 'delivered')      return { label: 'Delivered',  bg: '#dcfce7', color: '#15803d' }
  if (status === 'pending')        return { label: 'Processing', bg: '#fef3c7', color: '#92400e' }
  if (status === 'payment_failed') return { label: 'Pay failed', bg: '#fee2e2', color: '#991b1b' }
  if (status === 'cancelled')      return { label: 'Cancelled',  bg: '#f3f4f6', color: '#374151' }
  return { label: status || 'Unknown', bg: '#f3f3f0', color: '#4f4f49' }
}

function FaqSection({ html }) {
  return (
    <div className="section-card" style={{ border: '1px solid #ecece8', borderRadius: 14, padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>FAQ</h2>
      {html === null
        ? <p style={{ color: '#aaa', fontSize: 14 }}>Loading…</p>
        : <FaqAccordion html={html} />
      }
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #ecece8' }}>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 12px' }}>
          Didn't find what you were looking for?
        </p>
        <a href="/contact" style={{ display: 'inline-block', background: '#0a0a0a', color: '#fff', textDecoration: 'none', padding: '10px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
          Contact us
        </a>
      </div>
    </div>
  )
}

function OrdersSection({ user }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user?.email) return
    fetch(getApiUrl('/orders/track'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [user?.email])

  if (loading) return <p style={{ fontSize: 14, color: '#aaa' }}>Loading your orders...</p>
  if (err)     return <p style={{ fontSize: 14, color: '#b91c1c' }}>Error: {err}</p>
  if (orders.length === 0) return <p style={{ fontSize: 14, color: '#888' }}>No orders yet.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map(o => {
        const items = Array.isArray(o.items_json) ? o.items_json : []
        const badge = orderStatusBadge(o.status)
        const thumbs = items.filter(it => it.image_url).slice(0, 6)
        return (
          <div key={o.id} style={{ border: '1px solid #ecece8', borderRadius: 12, padding: '16px 18px', background: '#fff' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Order #{10000 + (o.id || 0)}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#888' }}>{formatDate(o.created_at)}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: badge.color, background: badge.bg, padding: '5px 10px', borderRadius: 999 }}>
                {badge.label}
              </span>
            </div>

            {/* Thumbnails */}
            {thumbs.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {thumbs.map((item, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={item.image_url} alt={item.name || ''}
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #ecece8', display: 'block' }}
                    />
                    {item.quantity > 1 && (
                      <span style={{ position: 'absolute', bottom: 3, right: 3, background: '#111', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 4px', lineHeight: 1.4 }}>
                        ×{item.quantity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Item names + total */}
            <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
              <p style={{ margin: '0 0 2px', color: '#888', fontSize: 12 }}>{items.map(formatItem).join(' · ') || '—'}</p>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111' }}>{formatMoney(o.amount_total, o.currency || 'EUR')}</p>
            </div>

            {/* Tracking info if available */}
            {(o.tracking_number || o.tracking_url) && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12 }}>
                {o.tracking_number && <p style={{ margin: '0 0 2px', color: '#166534' }}>Tracking: <strong>{o.tracking_number}</strong></p>}
                {o.tracking_url && (
                  <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                    Track your package →
                  </a>
                )}
              </div>
            )}

            {/* Size fit feedback — only for delivered orders */}
            {o.status === 'delivered' && (
              <FitFeedback
                orderId={o.id}
                userEmail={user.email}
                existingFit={(o.metadata_json || {}).fit_feedback || null}
              />
            )}

            <Link href={`/account/orders/${o.id}`}
              style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 600, color: '#111', textDecoration: 'underline' }}>
              View details
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'account',    label: 'My account', href: '/account' },
  { id: 'orders',     label: 'Orders',     href: '/account?tab=orders' },
  { id: 'size-guide', label: 'Size guide', href: '/size-guide' },
  { id: 'faq',        label: 'FAQ',        href: '/account?tab=faq' },
]

export default function AccountClient({ activeTab }) {
  const { user, signOut, updatePassword, updateEmail, reauthenticate, requestPasswordReset } = useAuth()
  const isOrders = activeTab === 'orders'
  const isFaq    = activeTab === 'faq'

  // Prefetch FAQ immediately on mount so it's ready when user clicks the tab
  const [faqHtml, setFaqHtml] = useState(null)
  useEffect(() => {
    fetch(getApiUrl('/faq'))
      .then(r => r.json())
      .then(d => setFaqHtml(d && typeof d.html === 'string' ? d.html : ''))
      .catch(() => setFaqHtml(''))
  }, [])

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '36px 20px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>My account</h1>
        {user && (
          <button onClick={signOut}
            style={{ background: 'none', border: '1px solid #e5e5e3', padding: '7px 16px', borderRadius: 999, fontSize: 13, color: '#888', cursor: 'pointer' }}>
            Sign out
          </button>
        )}
      </div>

      <div className="account-layout">
        {/* Sidebar */}
        <nav className="account-sidebar" style={{ border: '1px solid #ecece8', borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 100 }}>
          {user && (
            <div className="account-sidebar-email" style={{ padding: '14px 16px', borderBottom: '1px solid #ecece8', background: '#fafaf8' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#aaa', wordBreak: 'break-all' }}>{user.email}</p>
            </div>
          )}
          <div className="account-sidebar-nav" style={{ display: 'flex', flexDirection: 'column' }}>
            {NAV_ITEMS.map((item, i) => {
              const active = isFaq ? item.id === 'faq' : isOrders ? item.id === 'orders' : item.id === 'account'
              return (
                <a key={item.id} href={item.href}
                  style={{
                    display: 'block', padding: '13px 16px', fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#111' : '#666',
                    textDecoration: 'none',
                    background: active ? '#f5f5f3' : '#fff',
                    borderBottom: i < NAV_ITEMS.length - 1 ? '1px solid #ecece8' : 'none',
                  }}>
                  {item.label}
                </a>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div>
          {!user ? (
            <p style={{ fontSize: 14, color: '#888' }}>Sign in to view your account.</p>
          ) : isFaq ? (
            <FaqSection html={faqHtml} />
          ) : isOrders ? (
            <OrdersSection user={user} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InfoSection user={user} />
              <SecuritySection
                user={user}
                updatePassword={updatePassword}
                updateEmail={updateEmail}
                reauthenticate={reauthenticate}
                requestPasswordReset={requestPasswordReset}
              />
              <NewsletterSection user={user} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
