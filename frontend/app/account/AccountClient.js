'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'

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

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp = (err) => ({
  padding: '11px 14px', borderRadius: 10, fontSize: 14, outline: 'none',
  width: '100%', minHeight: 44,
  border: err ? '1.5px solid #ef4444' : '1px solid #e5e5e3',
  background: '#fff', boxSizing: 'border-box', appearance: 'auto',
})
const primaryBtn = (loading) => ({
  padding: '11px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600,
  border: 'none', background: '#111', color: '#fff',
  cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1,
})
const ghostBtn = () => ({
  padding: '11px 22px', borderRadius: 999, fontSize: 14, fontWeight: 500,
  border: '1.5px solid #e5e5e3', background: '#fff', color: '#555', cursor: 'pointer',
})

function MsgBox({ ok, text }) {
  if (!text) return null
  return (
    <div style={{
      borderRadius: 10, padding: '10px 14px', fontSize: 13, marginTop: 12,
      background: ok ? '#ecfdf3' : '#fef2f2',
      border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
      color: ok ? '#166534' : '#b91c1c',
    }}>{text}</div>
  )
}

function SubLabel({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 14px' }}>{children}</p>
}

// ── Personal info ─────────────────────────────────────────────────────────────
function InfoSection({ user }) {
  const empty = { first_name: '', last_name: '', phone: '', address: '', city: '', zip: '', country: 'DE' }
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  useEffect(() => {
    if (!user?.email) return
    async function load() {
      // 1. Try saved profile
      try {
        const r = await fetch(`${getApiUrl('/user-profile')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
        const d = await r.json()
        if (d?.first_name || d?.address) {
          setForm(f => ({ ...f, ...d }))
          setLoading(false)
          return
        }
      } catch {}

      // 2. Fallback: fill from most recent order
      try {
        const r = await fetch(`${getApiUrl('/orders/track')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
        if (r.ok) {
          const orders = await r.json()
          if (orders.length > 0) {
            const o = orders[0] // most recent first
            const nameParts = (o.shipping_name || '').trim().split(' ')
            const guessFirst = o.first_name || nameParts[0] || ''
            const guessLast  = o.last_name  || nameParts.slice(1).join(' ') || ''
            setForm(f => ({
              ...f,
              first_name: guessFirst,
              last_name:  guessLast,
              phone:      o.phone || '',
              address:    o.shipping_line1 || '',
              city:       o.shipping_city  || '',
              zip:        o.shipping_postal_code || '',
              country:    o.shipping_country || 'DE',
            }))
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [user?.email])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(getApiUrl('/user-profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...form }),
      })
      if (!res.ok) throw new Error()
      setMsg({ ok: true, text: 'Details saved' })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: 'Failed to save' }) }
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#aaa', fontSize: 14 }}>Loading...</p>

  return (
    <>
      <SubLabel>Shipping details</SubLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="First name" value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} style={inp()} />
          <input placeholder="Last name"  value={form.last_name  || ''} onChange={e => set('last_name',  e.target.value)} style={inp()} />
        </div>
        <input placeholder="Phone e.g. +49 151 234 567" value={form.phone || ''} onChange={e => set('phone', e.target.value)} style={inp()} />
        <input placeholder="Street address" value={form.address || ''} onChange={e => set('address', e.target.value)} style={inp()} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="City" value={form.city || ''} onChange={e => set('city', e.target.value)} style={inp()} />
          <input placeholder="ZIP / Postal code" value={form.zip || ''} onChange={e => set('zip', e.target.value)} style={inp()} />
        </div>
        <select value={form.country || 'DE'} onChange={e => set('country', e.target.value)} style={{ ...inp(), color: '#111' }}>
          {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>
      {msg && <MsgBox ok={msg.ok} text={msg.text} />}
      <div style={{ marginTop: 16 }}>
        <button onClick={save} disabled={saving} style={primaryBtn(saving)}>
          {saving ? 'Saving...' : 'Save details'}
        </button>
      </div>
    </>
  )
}

// ── Security ──────────────────────────────────────────────────────────────────
function SecuritySection({ user, updatePassword, updateEmail, reauthenticate, requestPasswordReset }) {
  // Password
  const [pw, setPw] = useState({ old: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [pwLoading, setPwLoading] = useState(false)

  // Email
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const checks = [
    { label: 'At least 8 characters', ok: pw.next.length >= 8 },
    { label: 'One lowercase letter',  ok: /[a-z]/.test(pw.next) },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(pw.next) },
    { label: 'One number',            ok: /\d/.test(pw.next) },
  ]
  const pwValid = checks.every(c => c.ok)

  async function changePassword() {
    setPwMsg(null)
    if (!pw.old) { setPwMsg({ ok: false, text: 'Enter your current password' }); return }
    if (!pwValid) { setPwMsg({ ok: false, text: 'New password does not meet requirements' }); return }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return }
    setPwLoading(true)
    const { error: reErr } = await reauthenticate(user.email, pw.old)
    if (reErr) { setPwMsg({ ok: false, text: 'Current password is incorrect' }); setPwLoading(false); return }
    const { error } = await updatePassword(pw.next)
    if (error) setPwMsg({ ok: false, text: error.message })
    else { setPwMsg({ ok: true, text: 'Password updated successfully' }); setPw({ old: '', next: '', confirm: '' }) }
    setPwLoading(false)
  }

  async function sendReset() {
    setPwLoading(true); setPwMsg(null)
    const { error } = await requestPasswordReset(user.email)
    if (error) setPwMsg({ ok: false, text: error.message })
    else setPwMsg({ ok: true, text: `Reset link sent to ${user.email}` })
    setPwLoading(false)
  }

  async function changeEmail() {
    setEmailMsg(null)
    const val = newEmail.trim()
    if (!val || !val.includes('@')) { setEmailMsg({ ok: false, text: 'Enter a valid email' }); return }
    if (val.toLowerCase() === user?.email?.toLowerCase()) { setEmailMsg({ ok: false, text: 'This is already your email' }); return }
    setEmailLoading(true)
    const { error } = await updateEmail(val)
    if (error) setEmailMsg({ ok: false, text: error.message })
    else setEmailMsg({ ok: true, text: 'Confirmation link sent. Click it in your new inbox to confirm the change.' })
    setEmailLoading(false)
  }

  return (
    <>
      {/* Password */}
      <div style={{ marginBottom: 32 }}>
        <SubLabel>Change password</SubLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
          {/* Current password */}
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} placeholder="Current password"
              value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))}
              style={{ ...inp(), paddingRight: 64 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer' }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* New password */}
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
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={changePassword} disabled={pwLoading} style={primaryBtn(pwLoading)}>
            {pwLoading ? 'Saving...' : 'Update password'}
          </button>
          <button onClick={sendReset} disabled={pwLoading}
            style={{ background: 'none', border: 'none', fontSize: 13, color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
            Forgot password? Reset via email
          </button>
        </div>
      </div>

      {/* Email */}
      <div>
        <SubLabel>Change email</SubLabel>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>Current: <strong style={{ color: '#111' }}>{user?.email}</strong></p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
          <input type="email" placeholder="New email address"
            value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inp()} />
        </div>
        {emailMsg && <MsgBox ok={emailMsg.ok} text={emailMsg.text} />}
        <div style={{ marginTop: 14 }}>
          <button onClick={changeEmail} disabled={emailLoading} style={primaryBtn(emailLoading)}>
            {emailLoading ? 'Sending...' : 'Send confirmation'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Newsletter ────────────────────────────────────────────────────────────────
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

  async function toggle() {
    setLoading(true); setMsg(null)
    if (subscribed) {
      await fetch(getApiUrl('/email-subscribers/unsubscribe'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      setSubscribed(false)
      setMsg({ ok: true, text: 'Unsubscribed from newsletter' })
    } else {
      await fetch(getApiUrl('/email-subscribers/capture'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, source: 'account_settings' }),
      })
      setSubscribed(true)
      setMsg({ ok: true, text: 'Subscribed to newsletter!' })
    }
    setTimeout(() => setMsg(null), 3000)
    setLoading(false)
  }

  if (subscribed === null) return <p style={{ fontSize: 14, color: '#aaa' }}>Loading...</p>

  return (
    <>
      <SubLabel>Newsletter preferences</SubLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          onClick={loading ? null : toggle}
          style={{
            width: 44, height: 24, borderRadius: 999, flexShrink: 0,
            background: subscribed ? '#111' : '#e5e5e3',
            position: 'relative', cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}>
          <div style={{
            position: 'absolute', top: 3, left: subscribed ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
            {subscribed ? 'Subscribed' : 'Not subscribed'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#aaa' }}>
            {subscribed
              ? 'You receive news and promotions from edm.clothes'
              : 'Subscribe to receive news and exclusive offers'}
          </p>
        </div>
      </div>
      {msg && <MsgBox ok={msg.ok} text={msg.text} />}
    </>
  )
}

// ── Orders ────────────────────────────────────────────────────────────────────
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

function OrdersSection({ user }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user?.email) return
    fetch(`${getApiUrl('/orders/track')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [user?.email])

  if (loading) return <p style={{ fontSize: 14, color: '#aaa' }}>Loading your orders...</p>
  if (err) return <p style={{ fontSize: 14, color: '#b91c1c' }}>Error: {err}</p>
  if (orders.length === 0) return <p style={{ fontSize: 14, color: '#888' }}>No orders yet.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map(o => {
        const items = Array.isArray(o.items_json) ? o.items_json : []
        return (
          <div key={o.id} style={{ border: '1px solid #ecece8', borderRadius: 12, padding: '14px 16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Order #{o.user_order_number || o.id}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#888' }}>{formatDate(o.created_at)}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '5px 10px', borderRadius: 999 }}>Paid</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
              <p style={{ margin: '0 0 2px' }}>{items.map(formatItem).join(', ') || '—'}</p>
              <p style={{ margin: 0, fontWeight: 500 }}>{formatMoney(o.amount_total, o.currency || 'EUR')}</p>
            </div>
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
const SUB_TABS = [
  { id: 'info',       label: 'Personal info' },
  { id: 'security',   label: 'Security' },
  { id: 'newsletter', label: 'Newsletter' },
]

export default function AccountClient({ activeTab, activeSub }) {
  const { user, signOut, updatePassword, updateEmail, reauthenticate, requestPasswordReset } = useAuth()

  const isOrders = activeTab === 'orders'

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 20px 70px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>My account</h1>
        {user && (
          <button onClick={signOut}
            style={{ background: 'none', border: '1px solid #e5e5e3', padding: '8px 18px', borderRadius: 999, fontSize: 13, color: '#888', cursor: 'pointer' }}>
            Sign out
          </button>
        )}
      </div>
      {user && <p style={{ fontSize: 13, color: '#aaa', marginBottom: 28 }}>{user.email}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Sidebar */}
        <nav style={{ border: '1px solid #ecece8', borderRadius: 12, overflow: 'hidden' }}>
          {[{ id: 'account', label: 'My account' }, { id: 'orders', label: 'Orders' }].map((item, i, arr) => {
            const active = isOrders ? item.id === 'orders' : item.id === 'account'
            return (
              <a key={item.id}
                href={item.id === 'account' ? '/account' : '/account?tab=orders'}
                style={{
                  display: 'block', padding: '13px 16px', fontSize: 14,
                  fontWeight: active ? 600 : 400, color: active ? '#111' : '#555',
                  textDecoration: 'none', background: active ? '#f5f5f3' : '#fff',
                  borderBottom: i < arr.length - 1 ? '1px solid #ecece8' : 'none',
                }}>
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* Content */}
        <div style={{ border: '1px solid #ecece8', borderRadius: 12, padding: '24px', background: '#fff', minHeight: 300 }}>
          {isOrders ? (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px' }}>Orders</h2>
              {!user
                ? <p style={{ fontSize: 14, color: '#888' }}>Sign in to view your orders.</p>
                : <OrdersSection user={user} />
              }
            </>
          ) : (
            <>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #ecece8' }}>
                {SUB_TABS.map(tab => {
                  const active = tab.id === activeSub
                  return (
                    <a key={tab.id}
                      href={tab.id === 'info' ? '/account' : `/account?sub=${tab.id}`}
                      style={{
                        padding: '10px 18px', fontSize: 13, fontWeight: active ? 600 : 400,
                        color: active ? '#111' : '#888', textDecoration: 'none',
                        borderBottom: active ? '2px solid #111' : '2px solid transparent',
                        marginBottom: -1,
                      }}>
                      {tab.label}
                    </a>
                  )
                })}
              </div>

              {!user ? (
                <p style={{ fontSize: 14, color: '#888' }}>Sign in to manage your account.</p>
              ) : activeSub === 'info' ? (
                <InfoSection user={user} />
              ) : activeSub === 'security' ? (
                <SecuritySection
                  user={user}
                  updatePassword={updatePassword}
                  updateEmail={updateEmail}
                  reauthenticate={reauthenticate}
                  requestPasswordReset={requestPasswordReset}
                />
              ) : activeSub === 'newsletter' ? (
                <NewsletterSection user={user} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
