'use client'
import { useEffect, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import { getApiUrl } from '../../lib/api'

const FIELDS = [
  {
    section: 'Email — общее',
    fields: [
      { key: 'email_from_name', label: 'Имя отправителя', placeholder: 'EDM Clothes', hint: 'Отображается в поле "От кого"' },
    ],
  },
  {
    section: 'Email — подтверждение заказа (покупатель)',
    fields: [
      { key: 'email_order_subject',  label: 'Тема письма',     placeholder: 'Order confirmation #{order_id} — EDM Clothes', hint: 'Переменные: {order_id}, {customer_name}, {total}' },
      { key: 'email_order_greeting', label: 'Приветствие',     placeholder: 'Thanks for your order, {customer_name}!', hint: '' },
      { key: 'email_order_message',  label: 'Основной текст',  placeholder: 'We received your order and started processing it.', hint: '', multiline: true },
      { key: 'email_order_footer',   label: 'Подпись / футер', placeholder: 'EDM Clothes — Made in Ukraine', hint: '' },
    ],
  },
  {
    section: 'Email — уведомление администратору',
    fields: [
      { key: 'email_admin_subject', label: 'Тема письма', placeholder: 'New order #{order_id} — {total}', hint: 'Переменные: {order_id}, {total}' },
    ],
  },
  {
    section: 'Popup',
    fields: [
      { key: 'popup_promo_code', label: 'Промокод в popup', placeholder: 'WELCOME10', hint: 'Код который показывается после подписки. Создай его в разделе Промокоды.' },
    ],
  },
]

export default function SettingsClient() {
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

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
      setMessage('Сохранено')
    } catch {
      setError('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const inp = (key, pl, multiline) => {
    const style = { width: '100%', marginTop: 6, border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }
    if (multiline) return (
      <textarea rows={3} value={values[key] || ''} onChange={e => set(key, e.target.value)}
        placeholder={pl} style={{ ...style, resize: 'vertical' }} />
    )
    return <input value={values[key] || ''} onChange={e => set(key, e.target.value)}
      placeholder={pl} style={style} />
  }

  // Превью письма
  const previewHtml = `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
      <h2>${(values.email_order_greeting || 'Thanks for your order, {customer_name}!').replace('{customer_name}', 'Jan')}</h2>
      <p style="color:#555">${values.email_order_message || 'We received your order and started processing it.'}</p>
      <p><strong>Order #42</strong> · Ref: abc123</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="border-bottom:2px solid #eee">
          <th align="left" style="padding:6px 0">Item</th><th align="center" style="padding:6px 0">Qty</th><th align="right" style="padding:6px 0">Price</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:6px 0">Example T-Shirt (size: M)</td><td style="text-align:center">1</td><td style="text-align:right">€49.00</td></tr>
        </tbody>
      </table>
      <table style="width:100%;margin-bottom:16px">
        <tr><td style="color:#888">Subtotal</td><td align="right">€49.00</td></tr>
        <tr><td style="color:#888">Shipping</td><td align="right">€5.00</td></tr>
        <tr style="font-weight:700;font-size:16px"><td style="padding-top:8px">Total</td><td align="right" style="padding-top:8px">€54.00</td></tr>
      </table>
      <p><strong>Shipping address:</strong><br/>Musterstrasse 1, Berlin, 10115, DE</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
      <p style="font-size:12px;color:#aaa">${values.email_order_footer || 'EDM Clothes'}</p>
    </div>
  `

  return (
    <AdminOnly>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Настройки</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setPreview(p => !p)}
              style={{ border: '1px solid #ddd', background: '#fff', borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>
              {preview ? 'Скрыть превью' : 'Превью письма'}
            </button>
            <button onClick={save} disabled={saving}
              style={{ border: 'none', background: '#111', color: '#fff', borderRadius: 10, padding: '9px 20px', fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {message && <div style={{ background: '#ecfdf3', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>{message}</div>}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {loading ? <p style={{ color: '#aaa' }}>Загрузка...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {FIELDS.map(({ section, fields }) => (
              <div key={section} style={{ background: '#fff', border: '1px solid #ecece8', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 16px' }}>{section}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {fields.map(({ key, label, placeholder, hint, multiline }) => (
                    <label key={key} style={{ fontSize: 13, color: '#444', display: 'block' }}>
                      {label}
                      {inp(key, placeholder, multiline)}
                      {hint && <span style={{ fontSize: 11, color: '#aaa', marginTop: 3, display: 'block' }}>{hint}</span>}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Настройка SMTP */}
            <div style={{ background: '#fafaf8', border: '1px solid #ecece8', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Email — SMTP (Zoho)</p>
              <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 12px', lineHeight: 1.5 }}>
                Настраивается через env variables на Render:<br />
                <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4 }}>ZOHO_SMTP_USER</code> = your@edmclothes.net &nbsp;
                <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4 }}>ZOHO_SMTP_PASSWORD</code> = app password из Zoho
              </p>
            </div>
          </div>
        )}

        {preview && (
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 12 }}>
              Превью — письмо покупателю (тема: "{(values.email_order_subject || 'Order confirmation').replace('{order_id}', '42').replace('{customer_name}', 'Jan').replace('{total}', '€54.00')}")
            </p>
            <div style={{ border: '1px solid #e5e5e0', borderRadius: 12, overflow: 'hidden' }}>
              <iframe
                srcDoc={previewHtml}
                style={{ width: '100%', height: 520, border: 'none' }}
                title="Email preview"
              />
            </div>
          </div>
        )}
      </main>
    </AdminOnly>
  )
}
