'use client'
import { useEffect, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import { getAdminApiUrl as getApiUrl } from '../../lib/api'

const FIELDS = [
  {
    section: 'SEO',
    fields: [
      { key: 'seo_site_name',            label: 'Site name',                  placeholder: 'edm.clothes',                                hint: 'Used in browser tab and as suffix in all page titles' },
      { key: 'seo_home_title',           label: 'Homepage — title',           placeholder: 'edm.clothes — Minimal Clothing',              hint: 'Leave blank to use site name' },
      { key: 'seo_home_description',     label: 'Homepage — description',     placeholder: 'Minimal essentials designed for everyday wear. Made in Ukraine.', hint: 'Shown in Google search results, ~155 chars', multiline: true },
      { key: 'seo_products_title',       label: 'Shop page — title',          placeholder: 'Shop — edm.clothes',                         hint: '' },
      { key: 'seo_products_description', label: 'Shop page — description',    placeholder: 'Browse the full edm.clothes collection.',     hint: '', multiline: true },
    ],
  },
  {
    section: 'General',
    fields: [
      { key: 'email_from_name', label: 'Sender name', placeholder: 'EDM Clothes', hint: 'Shown in the "From" field in all emails' },
    ],
  },
  {
    section: 'Order confirmation — customer email',
    fields: [
      { key: 'email_order_subject',  label: 'Subject',       placeholder: 'Order confirmation #{order_id} — EDM Clothes', hint: 'Variables: {order_id}, {customer_name}, {total}' },
      { key: 'email_order_greeting', label: 'Greeting',      placeholder: 'Thanks for your order, {customer_name}!', hint: 'Variables: {customer_name}' },
      { key: 'email_order_message',  label: 'Body text',     placeholder: 'We received your order and started processing it.', hint: '', multiline: true },
      { key: 'email_order_footer',   label: 'Footer / sign', placeholder: 'EDM Clothes — Made in Ukraine', hint: '' },
    ],
  },
  {
    section: 'New order alert — admin email',
    fields: [
      { key: 'email_admin_subject', label: 'Subject', placeholder: 'New order #{order_id} — {total}', hint: 'Variables: {order_id}, {total}. Sent to ORDER_ALERT_EMAIL on Render.' },
    ],
  },
  {
    section: 'Popup',
    fields: [
      { key: 'popup_promo_code', label: 'Discount code shown in popup', placeholder: 'WELCOME10', hint: 'Create this code in Promo Codes first, then paste it here.' },
    ],
  },
]

function buildCustomerPreview(values) {
  const greeting = (values.email_order_greeting || 'Thanks for your order, {customer_name}!').replace('{customer_name}', 'Jan')
  const message = values.email_order_message || 'We received your order and started processing it.'
  const footer = values.email_order_footer || 'EDM Clothes'
  return `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="margin-bottom:6px">${greeting}</h2>
    <p style="color:#555;margin-top:0">${message}</p>
    <p><strong>Order #42</strong> &nbsp;·&nbsp; Ref: abc123</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="border-bottom:2px solid #eee">
        <th align="left" style="padding:6px 0">Item</th>
        <th align="center" style="padding:6px 0">Qty</th>
        <th align="right" style="padding:6px 0">Price</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:6px 0">Example T-Shirt (size: M)</td><td style="text-align:center;padding:6px 0">1</td><td style="text-align:right;padding:6px 0">€49.00</td></tr>
        <tr><td style="padding:6px 0">Basic Hoodie</td><td style="text-align:center;padding:6px 0">1</td><td style="text-align:right;padding:6px 0">€79.00</td></tr>
      </tbody>
    </table>
    <table style="width:100%;margin-bottom:16px">
      <tr><td style="color:#888">Subtotal</td><td align="right">€128.00</td></tr>
      <tr><td style="color:#888">Shipping</td><td align="right">€5.00</td></tr>
      <tr style="font-weight:700;font-size:16px"><td style="padding-top:8px">Total</td><td align="right" style="padding-top:8px">€133.00</td></tr>
    </table>
    <p><strong>Shipping address:</strong><br/>Musterstrasse 1, Berlin, 10115, DE</p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
    <p style="font-size:12px;color:#aaa">${footer}</p>
  </div>`
}

function buildAdminPreview(values) {
  return `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
    <h2>New paid order received</h2>
    <p><strong>Order #42</strong> · Ref: abc123</p>
    <p><strong>Customer:</strong> jan@example.com</p>
    <p><strong>Shipping:</strong> Musterstrasse 1, Berlin, 10115, DE</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="border-bottom:2px solid #eee">
        <th align="left" style="padding:6px 0">Item</th>
        <th align="center" style="padding:6px 0">Qty</th>
        <th align="right" style="padding:6px 0">Total</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:6px 0">Example T-Shirt (size: M)</td><td style="text-align:center;padding:6px 0">1</td><td style="text-align:right;padding:6px 0">€49.00</td></tr>
        <tr><td style="padding:6px 0">Basic Hoodie</td><td style="text-align:center;padding:6px 0">1</td><td style="text-align:right;padding:6px 0">€79.00</td></tr>
      </tbody>
    </table>
    <hr style="border:none;border-top:1px solid #eee"/>
    <p><strong>Total: €133.00</strong></p>
  </div>`
}

export default function SettingsClient() {
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null) // 'customer' | 'admin' | null

  useEffect(() => {
    fetch(getApiUrl('/settings'), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setValues(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function set(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function save() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(getApiUrl('/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error()
      setMessage('Saved')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', marginTop: 6, border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }

  function renderInput(key, placeholder, multiline) {
    if (multiline) return (
      <textarea rows={3} value={values[key] || ''} onChange={e => set(key, e.target.value)}
        placeholder={placeholder} style={{ ...inputStyle, resize: 'vertical' }} />
    )
    return <input value={values[key] || ''} onChange={e => set(key, e.target.value)}
      placeholder={placeholder} style={inputStyle} />
  }

  const btnBase = { borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer', border: '1px solid #ddd' }

  return (
    <AdminOnly>
      <main style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Email Settings</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setPreview(p => p === 'customer' ? null : 'customer')}
              style={{ ...btnBase, background: preview === 'customer' ? '#f3f3f0' : '#fff', fontWeight: preview === 'customer' ? 600 : 400 }}>
              Preview — Customer
            </button>
            <button onClick={() => setPreview(p => p === 'admin' ? null : 'admin')}
              style={{ ...btnBase, background: preview === 'admin' ? '#f3f3f0' : '#fff', fontWeight: preview === 'admin' ? 600 : 400 }}>
              Preview — Admin alert
            </button>
            <button onClick={save} disabled={saving}
              style={{ ...btnBase, border: 'none', background: '#111', color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {message && <div style={{ background: '#ecfdf3', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>{message}</div>}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {/* Previews */}
        {preview && (
          <div style={{ marginBottom: 28, border: '1px solid #e5e5e0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#f5f5f3', padding: '10px 16px', fontSize: 12, color: '#888', borderBottom: '1px solid #e5e5e0' }}>
              {preview === 'customer'
                ? `Subject: "${(values.email_order_subject || 'Order confirmation #42').replace('{order_id}', '42').replace('{customer_name}', 'Jan').replace('{total}', '€133.00')}"`
                : `Subject: "${(values.email_admin_subject || 'New order #42 — €133.00').replace('{order_id}', '42').replace('{total}', '€133.00')}" → sent to ORDER_ALERT_EMAIL (Zoho)`
              }
            </div>
            <iframe
              srcDoc={preview === 'customer' ? buildCustomerPreview(values) : buildAdminPreview(values)}
              style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
              title="Email preview"
            />
          </div>
        )}

        {loading ? <p style={{ color: '#aaa' }}>Loading...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FIELDS.map(({ section, fields }) => (
              <div key={section} style={{ background: '#fff', border: '1px solid #ecece8', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 16px' }}>{section}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {fields.map(({ key, label, placeholder, hint, multiline }) => (
                    <label key={key} style={{ fontSize: 13, color: '#444', display: 'block' }}>
                      {label}
                      {renderInput(key, placeholder, multiline)}
                      {hint && <span style={{ fontSize: 11, color: '#aaa', marginTop: 3, display: 'block' }}>{hint}</span>}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* SMTP info */}
            <div style={{ background: '#fafaf8', border: '1px solid #ecece8', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 10px' }}>SMTP — Zoho Mail</p>
              <p style={{ fontSize: 13, color: '#555', margin: '0 0 8px', lineHeight: 1.6 }}>
                Emails are sent via <strong>Zoho SMTP</strong> when configured, or Resend as fallback.<br />
                Admin order alerts go to <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>ORDER_ALERT_EMAIL</code> set on Render — which is your Zoho inbox.
              </p>
              <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>
                Set on Render: <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>ZOHO_SMTP_USER</code> · <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>ZOHO_SMTP_PASSWORD</code>
              </p>
            </div>
          </div>
        )}
      </main>
    </AdminOnly>
  )
}
