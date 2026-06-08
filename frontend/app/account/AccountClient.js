'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'
import { trackNewsletterSignup } from '../lib/track'
import { normalizeLocale, pathForLocale } from '../lib/i18n'
import { buildItemImageAlt } from '../lib/seoText'

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
const EMPTY_FORM = { first_name: '', last_name: '', phone: '', address: '', city: '', zip: '', country: 'DE', preferred_locale: 'en' }
const LANGUAGE_OPTIONS = [
  ['en', 'English'],
  ['uk', 'Українська'],
]

const ACCOUNT_COPY = {
  en: {
    main: {
      title: 'My account',
      signOut: 'Sign out',
      signInRequired: 'Sign in to view your account.',
      navAccount: 'My account',
      navOrders: 'Orders',
    },
    info: {
      title: 'Personal info',
      loading: 'Loading...',
      firstName: 'First name',
      lastName: 'Last name',
      phone: 'Phone',
      address: 'Street address',
      city: 'City',
      zip: 'ZIP / Postal code',
      detailsSaved: 'Details saved',
      failedSave: 'Failed to save',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      edit: 'Edit',
    },
    security: {
      title: 'Security',
      changePassword: 'Change password',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
      show: 'Show',
      hide: 'Hide',
      enterCurrent: 'Enter your current password',
      requirements: 'New password does not meet requirements',
      mismatch: 'Passwords do not match',
      incorrect: 'Current password is incorrect',
      updated: 'Password updated',
      saving: 'Saving...',
      update: 'Update password',
      resetSent: 'Reset link sent to',
      forgotReset: 'Forgot? Reset via email',
      changeEmail: 'Change email',
      current: 'Current',
      newEmail: 'New email address',
      validEmail: 'Enter a valid email',
      sameEmail: 'This is already your current email',
      enterPasswordFirst: 'Enter your current password first',
      emailSent: 'Password verified. Confirmation sent to your new email address.',
      sending: 'Sending...',
      verify: 'Verify password & send confirmation',
      checks: ['At least 8 characters', 'One lowercase letter', 'One uppercase letter', 'One number'],
    },
    newsletter: {
      title: 'Newsletter',
      loading: 'Loading...',
      subscribed: 'You\'re subscribed to the newsletter',
      subscribedCopy: 'You receive news and exclusive offers from edm.clothes',
      unsubscribing: 'Unsubscribing...',
      unsubscribe: 'Unsubscribe',
      subscribeCopy: 'Subscribe to receive news and exclusive offers from edm.clothes',
      subscribing: 'Subscribing...',
      subscribe: 'Subscribe',
      subscribedMsg: 'You\'re now subscribed!',
      failedSubscribe: 'Failed to subscribe. Please try again.',
      unsubscribed: 'Unsubscribed',
      failedUnsubscribe: 'Failed to unsubscribe. Please try again.',
    },
    orders: {
      loading: 'Loading your orders...',
      error: 'Error',
      none: 'No orders yet.',
      item: 'Item',
      order: 'Order',
      tracking: 'Tracking',
      trackPackage: 'Track your package →',
      didFit: 'Did your items fit?',
      rateSizes: 'Rate sizes →',
      viewDetails: 'View details',
      statuses: {
        paid: 'Paid',
        shipped: 'Shipped',
        delivered: 'Delivered',
        pending: 'Processing',
        payment_failed: 'Pay failed',
        cancelled: 'Cancelled',
        unknown: 'Unknown',
      },
    },
  },
  uk: {
    main: {
      title: 'Мій акаунт',
      signOut: 'Вийти',
      signInRequired: 'Увійди, щоб переглянути акаунт.',
      navAccount: 'Мій акаунт',
      navOrders: 'Замовлення',
    },
    info: {
      title: 'Особисті дані',
      loading: 'Завантаження...',
      firstName: 'Ім’я',
      lastName: 'Прізвище',
      phone: 'Телефон',
      address: 'Адреса',
      city: 'Місто',
      zip: 'Поштовий індекс',
      detailsSaved: 'Дані збережено',
      failedSave: 'Не вдалося зберегти',
      save: 'Зберегти',
      saving: 'Збереження...',
      cancel: 'Скасувати',
      edit: 'Редагувати',
    },
    security: {
      title: 'Безпека',
      changePassword: 'Змінити пароль',
      currentPassword: 'Поточний пароль',
      newPassword: 'Новий пароль',
      confirmNewPassword: 'Підтвердь новий пароль',
      show: 'Показати',
      hide: 'Сховати',
      enterCurrent: 'Введи поточний пароль',
      requirements: 'Новий пароль не відповідає вимогам',
      mismatch: 'Паролі не збігаються',
      incorrect: 'Поточний пароль неправильний',
      updated: 'Пароль оновлено',
      saving: 'Збереження...',
      update: 'Оновити пароль',
      resetSent: 'Посилання для скидання надіслано на',
      forgotReset: 'Забув? Скинути через email',
      changeEmail: 'Змінити email',
      current: 'Поточний',
      newEmail: 'Новий email',
      validEmail: 'Введи коректний email',
      sameEmail: 'Це вже твій поточний email',
      enterPasswordFirst: 'Спочатку введи поточний пароль',
      emailSent: 'Пароль підтверджено. Лист для зміни email надіслано.',
      sending: 'Надсилання...',
      verify: 'Підтвердити пароль і надіслати лист',
      checks: ['Мінімум 8 символів', 'Одна мала літера', 'Одна велика літера', 'Одна цифра'],
    },
    newsletter: {
      title: 'Розсилка',
      loading: 'Завантаження...',
      subscribed: 'Ти підписаний(-а) на розсилку',
      subscribedCopy: 'Ти отримуєш новини та спеціальні пропозиції від edm.clothes',
      unsubscribing: 'Відписуємо...',
      unsubscribe: 'Відписатися',
      subscribeCopy: 'Підпишись, щоб отримувати новини та спеціальні пропозиції від edm.clothes',
      subscribing: 'Підписуємо...',
      subscribe: 'Підписатися',
      subscribedMsg: 'Готово, ти підписаний(-а)!',
      failedSubscribe: 'Не вдалося підписатися. Спробуй ще раз.',
      unsubscribed: 'Ти відписаний(-а)',
      failedUnsubscribe: 'Не вдалося відписатися. Спробуй ще раз.',
    },
    orders: {
      loading: 'Завантажуємо замовлення...',
      error: 'Помилка',
      none: 'Замовлень поки немає.',
      item: 'Товар',
      order: 'Замовлення',
      tracking: 'Відстеження',
      trackPackage: 'Відстежити посилку →',
      didFit: 'Як сіли речі?',
      rateSizes: 'Оцінити розміри →',
      viewDetails: 'Деталі',
      statuses: {
        paid: 'Оплачено',
        shipped: 'Відправлено',
        delivered: 'Доставлено',
        pending: 'В обробці',
        payment_failed: 'Оплата не пройшла',
        cancelled: 'Скасовано',
        unknown: 'Невідомо',
      },
    },
  },
}

function emptyFormForLocale(locale) {
  return { ...EMPTY_FORM, preferred_locale: normalizeLocale(locale) }
}

function InfoSection({ user, locale = 'en', copy }) {
  const defaultLocale = normalizeLocale(locale)
  const t = copy.info
  const [form, setForm] = useState(() => emptyFormForLocale(defaultLocale))
  const [snapshot, setSnapshot] = useState(() => emptyFormForLocale(defaultLocale)) // restored on cancel
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!user?.email) return
    async function load() {
      const emptyForm = emptyFormForLocale(defaultLocale)
      // 1. Try saved profile first
      try {
        const r = await fetch('/api/user-profile', { cache: 'no-store' })
        const d = await r.json()
        if (d && Object.keys(d).length > 0) {
          const merged = { ...emptyForm, ...d, preferred_locale: normalizeLocale(d.preferred_locale || defaultLocale) }
          setForm(merged); setSnapshot(merged)
          setLoading(false); return
        }
      } catch {}
      // 2. Pre-fill from most recent order if profile is empty
      try {
        const r = await fetch('/api/user/orders/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), cache: 'no-store' })
        if (r.ok) {
          const orders = await r.json()
          if (orders.length > 0) {
            const o = orders[0]
            const parts = (o.shipping_name || '').trim().split(' ')
            const merged = { ...emptyForm,
              first_name: o.first_name || parts[0] || '',
              last_name:  o.last_name  || parts.slice(1).join(' ') || '',
              phone:      o.phone || '',
              address:    o.shipping_line1 || '',
              city:       o.shipping_city  || '',
              zip:        o.shipping_postal_code || '',
              country:    o.shipping_country || 'DE',
              preferred_locale: defaultLocale,
            }
            setForm(merged); setSnapshot(merged)
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [defaultLocale, user?.email])

  function startEdit() { setSnapshot({ ...form }); setEditing(true); setMsg(null) }
  function cancelEdit() { setForm({ ...snapshot }); setEditing(false); setMsg(null) }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setSnapshot({ ...form })
      setEditing(false)
      setMsg({ ok: true, text: t.detailsSaved })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: t.failedSave }) }
    setSaving(false)
  }

  const ro = !editing // readOnly shorthand

  if (loading) return <SectionCard title={t.title}><p style={{ color: '#aaa', fontSize: 14 }}>{t.loading}</p></SectionCard>

  return (
    <SectionCard title={t.title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500 }}>
        <div className="account-2col">
          <input readOnly={ro} placeholder={t.firstName} value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} style={inp(false, ro)} />
          <input readOnly={ro} placeholder={t.lastName} value={form.last_name  || ''} onChange={e => set('last_name',  e.target.value)} style={inp(false, ro)} />
        </div>
        <input readOnly={ro} placeholder={t.phone} value={form.phone || ''} onChange={e => set('phone', e.target.value)} style={inp(false, ro)} />
        <input readOnly={ro} placeholder={t.address} value={form.address || ''} onChange={e => set('address', e.target.value)} style={inp(false, ro)} />
        <div className="account-2col">
          <input readOnly={ro} placeholder={t.city} value={form.city || ''} onChange={e => set('city', e.target.value)} style={inp(false, ro)} />
          <input readOnly={ro} placeholder={t.zip} value={form.zip || ''} onChange={e => set('zip', e.target.value)} style={inp(false, ro)} />
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
        <div style={{ position: 'relative' }}>
          <select
            disabled={ro}
            value={normalizeLocale(form.preferred_locale || defaultLocale)}
            onChange={e => set('preferred_locale', normalizeLocale(e.target.value))}
            style={{ ...inp(false, ro), appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, cursor: ro ? 'default' : 'pointer' }}
          >
            {LANGUAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
              {saving ? t.saving : t.save}
            </button>
            <button onClick={cancelEdit} disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 400, border: '1px solid #e5e5e3', background: '#fff', color: '#666', cursor: 'pointer' }}>
              {t.cancel}
            </button>
          </>
        ) : (
          <button onClick={startEdit}
            style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: '1px solid #e5e5e3', background: '#fff', color: '#111', cursor: 'pointer' }}>
            {t.edit}
          </button>
        )}
      </div>
    </SectionCard>
  )
}

// ── Security section ──────────────────────────────────────────────────────────
function SecuritySection({ user, updatePassword, updateEmail, reauthenticate, requestPasswordReset, copy }) {
  const t = copy.security
  const [pw, setPw] = useState({ old: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [pwLoading, setPwLoading] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [showEmailPassword, setShowEmailPassword] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const checks = [
    { label: t.checks[0], ok: pw.next.length >= 8 },
    { label: t.checks[1], ok: /[a-z]/.test(pw.next) },
    { label: t.checks[2], ok: /[A-Z]/.test(pw.next) },
    { label: t.checks[3], ok: /\d/.test(pw.next) },
  ]

  async function changePassword() {
    setPwMsg(null)
    if (!pw.old) { setPwMsg({ ok: false, text: t.enterCurrent }); return }
    if (!checks.every(c => c.ok)) { setPwMsg({ ok: false, text: t.requirements }); return }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: t.mismatch }); return }
    setPwLoading(true)
    const { error: reErr } = await reauthenticate(user.email, pw.old)
    if (reErr) { setPwMsg({ ok: false, text: t.incorrect }); setPwLoading(false); return }
    const { error } = await updatePassword(pw.next)
    if (error) setPwMsg({ ok: false, text: error.message })
    else { setPwMsg({ ok: true, text: t.updated }); setPw({ old: '', next: '', confirm: '' }) }
    setPwLoading(false)
  }

  async function sendReset() {
    setPwLoading(true); setPwMsg(null)
    const { error } = await requestPasswordReset(user.email)
    setPwMsg(error ? { ok: false, text: error.message } : { ok: true, text: `${t.resetSent} ${user.email}` })
    setPwLoading(false)
  }

  async function changeEmail() {
    setEmailMsg(null)
    const val = newEmail.trim()
    if (!val || !val.includes('@')) { setEmailMsg({ ok: false, text: t.validEmail }); return }
    if (val.toLowerCase() === user?.email?.toLowerCase()) { setEmailMsg({ ok: false, text: t.sameEmail }); return }
    if (!emailPassword) { setEmailMsg({ ok: false, text: t.enterPasswordFirst }); return }
    setEmailLoading(true)
    const { error: reErr } = await reauthenticate(user.email, emailPassword)
    if (reErr) { setEmailMsg({ ok: false, text: t.incorrect }); setEmailLoading(false); return }
    const { error } = await updateEmail(val)
    if (error) setEmailMsg({ ok: false, text: error.message })
    else {
      setEmailMsg({ ok: true, text: t.emailSent })
      setNewEmail('')
      setEmailPassword('')
    }
    setEmailLoading(false)
  }

  return (
    <SectionCard title={t.title}>
      {/* Password */}
      <div style={{ maxWidth: 420 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px', color: '#555' }}>{t.changePassword}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} placeholder={t.currentPassword}
              value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))}
              style={{ ...inp(), paddingRight: 64 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer' }}>
              {showPw ? t.hide : t.show}
            </button>
          </div>
          <input type={showPw ? 'text' : 'password'} placeholder={t.newPassword}
            value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} style={inp()} />
          {pw.next && (
            <div style={{ border: '1px solid #ecece8', borderRadius: 8, padding: '8px 12px', fontSize: 12, background: '#fafaf8' }}>
              {checks.map((c, i) => (
                <p key={i} style={{ margin: '2px 0', color: c.ok ? '#15803d' : '#aaa' }}>{c.ok ? '✓' : '·'} {c.label}</p>
              ))}
            </div>
          )}
          <input type={showPw ? 'text' : 'password'} placeholder={t.confirmNewPassword}
            value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} style={inp()} />
        </div>
        {pwMsg && <MsgBox ok={pwMsg.ok} text={pwMsg.text} />}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <button onClick={changePassword} disabled={pwLoading}
            style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: pwLoading ? 'default' : 'pointer', opacity: pwLoading ? 0.65 : 1 }}>
            {pwLoading ? t.saving : t.update}
          </button>
          <button onClick={sendReset} disabled={pwLoading}
            style={{ background: 'none', border: 'none', fontSize: 13, color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
            {t.forgotReset}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: '#ecece8', margin: '24px 0' }} />

      {/* Email */}
      <div style={{ maxWidth: 420 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px', color: '#555' }}>{t.changeEmail}</p>
        <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 10px' }}>{t.current}: <strong style={{ color: '#111' }}>{user?.email}</strong></p>
        <input type="email" placeholder={t.newEmail}
          value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inp()} />
        <div style={{ position: 'relative', marginTop: 10 }}>
          <input type={showEmailPassword ? 'text' : 'password'} placeholder={t.currentPassword}
            value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
            style={{ ...inp(), paddingRight: 64 }} />
          <button type="button" onClick={() => setShowEmailPassword(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer' }}>
            {showEmailPassword ? t.hide : t.show}
          </button>
        </div>
        {emailMsg && <MsgBox ok={emailMsg.ok} text={emailMsg.text} />}
        <button onClick={changeEmail} disabled={emailLoading}
          style={{ marginTop: 14, padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: emailLoading ? 'default' : 'pointer', opacity: emailLoading ? 0.65 : 1 }}>
          {emailLoading ? t.sending : t.verify}
        </button>
      </div>
    </SectionCard>
  )
}

// ── Newsletter section ────────────────────────────────────────────────────────
function NewsletterSection({ user, locale = 'en' }) {
  const preferredLocale = normalizeLocale(locale)
  const t = ACCOUNT_COPY[preferredLocale].newsletter
  const [subscribed, setSubscribed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!user?.email) return
    fetch('/api/user/email-subscribers/status', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setSubscribed(d.subscribed))
      .catch(() => setSubscribed(false))
  }, [user?.email])

  async function subscribe() {
    setLoading(true); setMsg(null)
    try {
      const res = await fetch(getApiUrl('/email-subscribers/capture'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          source: 'account_settings',
          preferred_locale: preferredLocale,
          metadata: { preferred_locale: preferredLocale },
        }),
      })
      if (!res.ok) throw new Error()
      setSubscribed(true)
      trackNewsletterSignup({ source: 'account_settings' })
      setMsg({ ok: true, text: t.subscribedMsg })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: t.failedSubscribe }) }
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true); setMsg(null)
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      if (!res.ok) throw new Error()
      setSubscribed(false)
      setMsg({ ok: true, text: t.unsubscribed })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: t.failedUnsubscribe }) }
    setLoading(false)
  }

  return (
    <SectionCard title={t.title}>
      {subscribed === null ? (
        <p style={{ fontSize: 14, color: '#aaa' }}>{t.loading}</p>
      ) : subscribed ? (
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{t.subscribed}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{t.subscribedCopy}</p>
          <button onClick={unsubscribe} disabled={loading}
            style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#aaa', textDecoration: 'underline', cursor: loading ? 'default' : 'pointer' }}>
            {loading ? t.unsubscribing : t.unsubscribe}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#555' }}>{t.subscribeCopy}</p>
          <button onClick={subscribe} disabled={loading}
            style={{ padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 600, border: 'none', background: '#111', color: '#fff', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1 }}>
            {loading ? t.subscribing : t.subscribe}
          </button>
        </div>
      )}
      {msg && <MsgBox ok={msg.ok} text={msg.text} />}
    </SectionCard>
  )
}

// ── Orders section ────────────────────────────────────────────────────────────
function formatDate(v, locale = 'en') {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d) ? '-' : d.toLocaleString(locale === 'uk' ? 'uk-UA' : 'en-US')
}
function formatMoney(v, cur = 'EUR', locale = 'en') {
  return new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en-US', { style: 'currency', currency: (cur || 'eur').toUpperCase() }).format(Number(v || 0))
}
function formatItem(item, fallback = 'Item') {
  const name = item?.name || fallback
  const qty  = Math.max(1, Number(item?.quantity || 1))
  const size = String(item?.size || '').trim()
  return `${name}${size ? ` (${size})` : ''} ×${qty}`
}


function orderStatusBadge(status) {
  if (status === 'paid')           return { key: 'paid', bg: '#dcfce7', color: '#166534' }
  if (status === 'shipped')        return { key: 'shipped', bg: '#dbeafe', color: '#1d4ed8' }
  if (status === 'delivered')      return { key: 'delivered', bg: '#dcfce7', color: '#15803d' }
  if (status === 'pending')        return { key: 'pending', bg: '#fef3c7', color: '#92400e' }
  if (status === 'payment_failed') return { key: 'payment_failed', bg: '#fee2e2', color: '#991b1b' }
  if (status === 'cancelled')      return { key: 'cancelled', bg: '#f3f4f6', color: '#374151' }
  return { key: 'unknown', raw: status, bg: '#f3f3f0', color: '#4f4f49' }
}

function OrdersSection({ user, locale = 'en' }) {
  const preferredLocale = normalizeLocale(locale)
  const t = ACCOUNT_COPY[preferredLocale].orders
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user?.email) return
    fetch('/api/user/orders/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [user?.email])

  if (loading) return <p style={{ fontSize: 14, color: '#aaa' }}>{t.loading}</p>
  if (err)     return <p style={{ fontSize: 14, color: '#b91c1c' }}>{t.error}: {err}</p>
  if (orders.length === 0) return <p style={{ fontSize: 14, color: '#888' }}>{t.none}</p>

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
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t.order} #{10000 + (o.id || 0)}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#888' }}>{formatDate(o.created_at, preferredLocale)}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: badge.color, background: badge.bg, padding: '5px 10px', borderRadius: 999 }}>
                {badge.raw || t.statuses[badge.key] || t.statuses.unknown}
              </span>
            </div>

            {/* Thumbnails */}
            {thumbs.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {thumbs.map((item, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={item.image_url} alt={buildItemImageAlt(item, preferredLocale)}
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
              <p style={{ margin: '0 0 2px', color: '#888', fontSize: 12 }}>{items.map(item => formatItem(item, t.item)).join(' · ') || '—'}</p>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111' }}>{formatMoney(o.amount_total, o.currency || 'EUR', preferredLocale)}</p>
            </div>

            {/* Tracking info if available */}
            {(o.tracking_number || o.tracking_url) && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12 }}>
                {o.tracking_number && <p style={{ margin: '0 0 2px', color: '#166534' }}>{t.tracking}: <strong>{o.tracking_number}</strong></p>}
                {o.tracking_url && (
                  <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                    {t.trackPackage}
                  </a>
                )}
              </div>
            )}

            {/* Rate sizes — prompt for delivered orders */}
            {o.status === 'delivered' && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#888' }}>
                {t.didFit}{' '}
                <Link href={pathForLocale(`/account/orders/${o.id}`, preferredLocale)} style={{ color: '#111', fontWeight: 600, textDecoration: 'underline' }}>
                  {t.rateSizes}
                </Link>
              </p>
            )}

            <Link href={pathForLocale(`/account/orders/${o.id}`, preferredLocale)}
              style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 600, color: '#111', textDecoration: 'underline' }}>
              {t.viewDetails}
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AccountClient({ activeTab, locale = 'en' }) {
  const { user, signOut, updatePassword, updateEmail, reauthenticate, requestPasswordReset } = useAuth()
  const preferredLocale = normalizeLocale(locale)
  const copy = ACCOUNT_COPY[preferredLocale]
  const isOrders = activeTab === 'orders'
  const navItems = [
    { id: 'account', label: copy.main.navAccount, href: pathForLocale('/account', preferredLocale) },
    { id: 'orders', label: copy.main.navOrders, href: pathForLocale('/account?tab=orders', preferredLocale) },
  ]

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '36px 20px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>{copy.main.title}</h1>
        {user && (
          <button onClick={signOut}
            style={{ background: 'none', border: '1px solid #e5e5e3', padding: '7px 16px', borderRadius: 999, fontSize: 13, color: '#888', cursor: 'pointer' }}>
            {copy.main.signOut}
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
            {navItems.map((item, i) => {
              const active = isOrders ? item.id === 'orders' : item.id === 'account'
              return (
                <a key={item.id} href={item.href}
                  style={{
                    display: 'block', padding: '13px 16px', fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#111' : '#666',
                    textDecoration: 'none',
                    background: active ? '#f5f5f3' : '#fff',
                    borderBottom: i < navItems.length - 1 ? '1px solid #ecece8' : 'none',
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
            <p style={{ fontSize: 14, color: '#888' }}>{copy.main.signInRequired}</p>
          ) : isOrders ? (
            <OrdersSection user={user} locale={preferredLocale} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InfoSection user={user} locale={preferredLocale} copy={copy} />
              <SecuritySection
                user={user}
                updatePassword={updatePassword}
                updateEmail={updateEmail}
                reauthenticate={reauthenticate}
                requestPasswordReset={requestPasswordReset}
                copy={copy}
              />
              <NewsletterSection user={user} locale={preferredLocale} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
