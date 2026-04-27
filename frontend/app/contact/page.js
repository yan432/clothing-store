'use client'
import { useState } from 'react'
import { getApiUrl } from '../lib/api'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(getApiUrl('/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Something went wrong')
      }
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const input = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px', borderRadius: 12,
    border: '1.5px solid #e5e5e0', fontSize: 15,
    outline: 'none', background: '#fff',
    fontFamily: 'inherit',
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Contact us</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>We're happy to help — choose how you'd like to reach us.</p>

      {/* Three options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 56 }}>
        <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 28, margin: '0 0 10px' }}>✉️</p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>Email us</p>
          <a href="mailto:sales@edmclothes.net" style={{ fontSize: 13, color: '#666', textDecoration: 'none', borderBottom: '1px solid #ccc' }}>
            sales@edmclothes.net
          </a>
        </div>
        <a href="/faq" style={{ background: '#f5f5f3', borderRadius: 16, padding: '24px 20px', textAlign: 'center', textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <p style={{ fontSize: 28, margin: '0 0 10px' }}>❓</p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>FAQ</p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Find quick answers</p>
        </a>
        <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 28, margin: '0 0 10px' }}>🕐</p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>Working hours</p>
          <p style={{ fontSize: 13, color: '#666', margin: '0 0 4px' }}>Mon–Fri, 8:00 am – 4:00 pm</p>
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Reply within 1–2 business days</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #ecece8', marginBottom: 40 }} />

      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 24px' }}>Send a message</h2>

      {sent ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, margin: '0 0 8px' }}>✅</p>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: '#15803d' }}>Message sent!</p>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>We'll get back to you within 1–2 business days. Check your inbox for a confirmation.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Name *</label>
              <input value={form.name} onChange={set('name')} required placeholder="Your name" style={input} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Email *</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="your@email.com" style={input} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Subject</label>
            <input value={form.subject} onChange={set('subject')} placeholder="What is this about?" style={input} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Message *</label>
            <textarea
              value={form.message}
              onChange={set('message')}
              required
              rows={6}
              placeholder="Tell us what's on your mind..."
              style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 16px', fontSize: 14, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#0a0a0a', color: '#fff', border: 'none',
              padding: '14px 32px', borderRadius: 999, fontSize: 14,
              fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1, alignSelf: 'flex-start',
              letterSpacing: '0.04em',
            }}
          >
            {loading ? 'Sending...' : 'Send message'}
          </button>
        </form>
      )}
    </main>
  )
}
