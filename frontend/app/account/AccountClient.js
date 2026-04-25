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

const accountSections = [
  { id: 'overview',   title: 'My account' },
  { id: 'orders',     title: 'Orders' },
  { id: 'profile',    title: 'My details' },
  { id: 'security',   title: 'Security' },
  { id: 'newsletter', title: 'Newsletter' },
]

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}
function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'eur').toUpperCase() }).format(Number(value || 0))
}
function formatItemLine(item) {
  const name = String(item?.name || 'Item')
  const qty = Math.max(1, Number(item?.quantity || 1))
  const size = String(item?.size || '').trim()
  return `${name}${size ? ` (${size})` : ''} x${qty}`
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp = (err) => ({
  padding: '11px 14px', borderRadius: 10, fontSize: 14, outline: 'none',
  width: '100%', border: err ? '1.5px solid #ef4444' : '1px solid #e5e5e3',
  background: '#fff', boxSizing: 'border-box',
})
const btn = (primary) => ({
  padding: '11px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600,
  border: primary ? 'none' : '1.5px solid #e5e5e3',
  background: primary ? '#111' : '#fff',
  color: primary ? '#fff' : '#555',
  cursor: 'pointer',
})
const sectionLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 14px' }
const card = { background: '#fff', border: '1px solid #ecece8', borderRadius: 12, padding: '20px 20px', marginBottom: 20 }

// ─── Profile section ──────────────────────────────────────────────────────────
function ProfileSection({ user }) {
  const [form, setForm] = useState({ first_name:'', last_name:'', phone:'', address:'', city:'', zip:'', country:'DE' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user?.email) return
    fetch(`${getApiUrl('/user-profile')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (data && data.email) setForm(f => ({ ...f, ...data })); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user?.email])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function save() {
    setSaving(true); setMsg(''); setErr('')
    try {
      const res = await fetch(getApiUrl('/user-profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...form }),
      })
      if (!res.ok) throw new Error()
      setMsg('Saved')
      setTimeout(() => setMsg(''), 3000)
    } catch { setErr('Failed to save') }
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#aaa', fontSize: 14 }}>Loading...</p>

  return (
    <>
      <div style={card}>
        <p style={sectionLabel}>Shipping details</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="First name" value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} style={inp()} />
            <input placeholder="Last name" value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} style={inp()} />
          </div>
          <input placeholder="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} style={inp()} />
          <input placeholder="Street address" value={form.address || ''} onChange={e => set('address', e.target.value)} style={inp()} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="City" value={form.city || ''} onChange={e => set('city', e.target.value)} style={inp()} />
            <input placeholder="ZIP / Postal code" value={form.zip || ''} onChange={e => set('zip', e.target.value)} style={inp()} />
          </div>
          <select value={form.country || 'DE'} onChange={e => set('country', e.target.value)}
            style={{ ...inp(), color: '#1a1a18' }}>
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </div>
      </div>

      {msg && <div style={{ background: '#ecfdf3', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 14 }}>{msg}</div>}
      {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 14 }}>{err}</div>}
      <button onClick={save} disabled={saving} style={{ ...btn(true), opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : 'Save details'}
      </button>
    </>
  )
}

// ─── Security section ─────────────────────────────────────────────────────────
function SecuritySection({ user, updatePassword, updateEmail }) {
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const [emailVal, setEmailVal] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  const pwChecks = [
    { label: 'At least 8 characters', valid: pwForm.next.length >= 8 },
    { label: 'One lowercase letter', valid: /[a-z]/.test(pwForm.next) },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(pwForm.next) },
    { label: 'One number', valid: /\d/.test(pwForm.next) },
  ]
  const pwValid = pwChecks.every(c => c.valid)

  async function changePassword() {
    setPwMsg(''); setPwErr('')
    if (!pwForm.next) { setPwErr('Enter a new password'); return }
    if (!pwValid) { setPwErr('Password does not meet requirements'); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr('Passwords do not match'); return }
    setPwLoading(true)
    const { error } = await updatePassword(pwForm.next)
    if (error) setPwErr(error.message)
    else { setPwMsg('Password updated'); setPwForm({ current: '', next: '', confirm: '' }) }
    setPwLoading(false)
  }

  async function changeEmail() {
    setEmailMsg(''); setEmailErr('')
    if (!emailVal.trim() || !emailVal.includes('@')) { setEmailErr('Enter a valid email'); return }
    if (emailVal.trim().toLowerCase() === user?.email?.toLowerCase()) { setEmailErr('This is already your email'); return }
    setEmailLoading(true)
    const { error } = await updateEmail(emailVal.trim())
    if (error) setEmailErr(error.message)
    else setEmailMsg('Confirmation link sent to your new email. Click it to confirm the change.')
    setEmailLoading(false)
  }

  return (
    <>
      {/* Change password */}
      <div style={card}>
        <p style={sectionLabel}>Change password</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} placeholder="New password"
              value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
              style={{ ...inp(), paddingRight: 60 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer' }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {pwForm.next && (
            <div style={{ border: '1px solid #ecece8', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
              {pwChecks.map((c, i) => (
                <p key={i} style={{ margin: '2px 0', color: c.valid ? '#15803d' : '#aaa' }}>{c.valid ? '✓' : '·'} {c.label}</p>
              ))}
            </div>
          )}
          <input type={showPw ? 'text' : 'password'} placeholder="Confirm new password"
            value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            style={inp()} />
        </div>
        {pwMsg && <div style={{ background: '#ecfdf3', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 14 }}>{pwMsg}</div>}
        {pwErr && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 14 }}>{pwErr}</div>}
        <button onClick={changePassword} disabled={pwLoading}
          style={{ ...btn(true), marginTop: 14, opacity: pwLoading ? 0.7 : 1 }}>
          {pwLoading ? 'Saving...' : 'Update password'}
        </button>
      </div>

      {/* Change email */}
      <div style={card}>
        <p style={sectionLabel}>Change email</p>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>Current: <strong>{user?.email}</strong></p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
          <input type="email" placeholder="New email address"
            value={emailVal} onChange={e => setEmailVal(e.target.value)}
            style={inp()} />
        </div>
        {emailMsg && <div style={{ background: '#ecfdf3', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 14 }}>{emailMsg}</div>}
        {emailErr && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 14 }}>{emailErr}</div>}
        <button onClick={changeEmail} disabled={emailLoading}
          style={{ ...btn(true), marginTop: 14, opacity: emailLoading ? 0.7 : 1 }}>
          {emailLoading ? 'Sending...' : 'Send confirmation'}
        </button>
      </div>
    </>
  )
}

// ─── Newsletter section ───────────────────────────────────────────────────────
function NewsletterSection({ user }) {
  const [subscribed, setSubscribed] = useState(null) // null = loading
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user?.email) return
    fetch(`${getApiUrl('/email-subscribers/status')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setSubscribed(data.subscribed))
      .catch(() => setSubscribed(false))
  }, [user?.email])

  async function subscribe() {
    setLoading(true); setMsg('')
    await fetch(getApiUrl('/email-subscribers/capture'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, source: 'account_settings' }),
    })
    setSubscribed(true)
    setMsg('You\'re subscribed!')
    setTimeout(() => setMsg(''), 3000)
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true); setMsg('')
    await fetch(getApiUrl('/email-subscribers/unsubscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
    setSubscribed(false)
    setMsg('Unsubscribed.')
    setTimeout(() => setMsg(''), 3000)
    setLoading(false)
  }

  if (subscribed === null) return <p style={{ color: '#aaa', fontSize: 14 }}>Loading...</p>

  return (
    <div style={card}>
      <p style={sectionLabel}>Newsletter</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 44, height: 24, borderRadius: 999,
          background: subscribed ? '#111' : '#e5e5e3',
          position: 'relative', cursor: loading ? 'default' : 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
        }} onClick={loading ? null : (subscribed ? unsubscribe : subscribe)}>
          <div style={{
            position: 'absolute', top: 3, left: subscribed ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
            {subscribed ? 'Subscribed to newsletters' : 'Not subscribed'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#aaa' }}>
            {subscribed
              ? 'You receive news and promotions from edm.clothes'
              : 'Subscribe to get news and exclusive offers'}
          </p>
        </div>
      </div>
      {msg && <p style={{ fontSize: 13, color: '#166534', marginTop: 12 }}>{msg}</p>}
    </div>
  )
}

// ─── Orders section ───────────────────────────────────────────────────────────
function OrdersSection({ user }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.email) return
    fetch(`${getApiUrl('/orders/track')}?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [user?.email])

  if (loading) return <p style={{ fontSize: 14, color: '#aaa' }}>Loading your orders...</p>
  if (error) return <p style={{ fontSize: 14, color: '#b91c1c' }}>Error: {error}</p>
  if (orders.length === 0) return <p style={{ fontSize: 14, color: '#888' }}>No orders yet for {user.email}.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map(order => {
        const items = Array.isArray(order.items_json) ? order.items_json : []
        return (
          <div key={order.id} style={{ border: '1px solid #ecece8', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Order #{order.user_order_number || order.id}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#888' }}>Placed: {formatDate(order.created_at)}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '5px 10px', borderRadius: 999 }}>Paid</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
              <p style={{ margin: '0 0 2px' }}>{items.map(formatItemLine).join(', ') || '—'}</p>
              <p style={{ margin: '2px 0 0' }}>Total: {formatMoney(order.amount_total, order.currency || 'EUR')}</p>
            </div>
            <Link href={`/account/orders/${order.id}`} style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 600, color: '#111', textDecoration: 'underline' }}>
              View order details
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AccountClient({ activeTab }) {
  const { user, signOut, updatePassword, updateEmail } = useAuth()

  const activeSection = useMemo(
    () => accountSections.find(s => s.id === activeTab) || accountSections[0],
    [activeTab]
  )

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 20px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>My account</h1>
        {user && (
          <button onClick={signOut}
            style={{ background: 'none', border: '1px solid #e5e5e3', padding: '8px 18px', borderRadius: 999, fontSize: 13, color: '#888', cursor: 'pointer' }}>
            Sign out
          </button>
        )}
      </div>

      {user && (
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24, marginTop: -16 }}>{user.email}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Sidebar */}
        <nav style={{ border: '1px solid #ecece8', borderRadius: 12, overflow: 'hidden' }}>
          {accountSections.map((s, i) => {
            const active = s.id === activeSection.id
            return (
              <a key={s.id} href={s.id === 'overview' ? '/account' : `/account?tab=${s.id}`}
                style={{
                  display: 'block', padding: '13px 16px', fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? '#111' : '#555', textDecoration: 'none',
                  background: active ? '#f5f5f3' : '#fff',
                  borderBottom: i < accountSections.length - 1 ? '1px solid #ecece8' : 'none',
                }}>
                {s.title}
              </a>
            )
          })}
        </nav>

        {/* Content */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 20px' }}>{activeSection.title}</h2>

          {activeSection.id === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {accountSections.filter(s => s.id !== 'overview').map(s => (
                <a key={s.id} href={`/account?tab=${s.id}`}
                  style={{ display: 'block', border: '1px solid #ecece8', borderRadius: 12, padding: '16px', textDecoration: 'none', color: '#111' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{s.title}</p>
                </a>
              ))}
            </div>
          )}

          {activeSection.id === 'orders' && (
            !user
              ? <p style={{ fontSize: 14, color: '#888' }}>Sign in to view your orders.</p>
              : <OrdersSection user={user} />
          )}

          {activeSection.id === 'profile' && (
            !user
              ? <p style={{ fontSize: 14, color: '#888' }}>Sign in to manage your details.</p>
              : <ProfileSection user={user} />
          )}

          {activeSection.id === 'security' && (
            !user
              ? <p style={{ fontSize: 14, color: '#888' }}>Sign in to manage security settings.</p>
              : <SecuritySection user={user} updatePassword={updatePassword} updateEmail={updateEmail} />
          )}

          {activeSection.id === 'newsletter' && (
            !user
              ? <p style={{ fontSize: 14, color: '#888' }}>Sign in to manage newsletter preferences.</p>
              : <NewsletterSection user={user} />
          )}
        </div>
      </div>
    </main>
  )
}
