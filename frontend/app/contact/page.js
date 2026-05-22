'use client'
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { Mail, HelpCircle, Clock, CheckCircle2 } from 'lucide-react'
import { getApiUrl } from '../lib/api'
import { trackContact } from '../lib/track'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileWidgetRef = useRef(null)
  const turnstileContainerRef = useRef(null)

  // Render the invisible Turnstile widget once the script and DOM are ready.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || sent) return
    let cancelled = false
    function tryRender() {
      if (cancelled) return
      const ts = typeof window !== 'undefined' ? window.turnstile : null
      if (!ts || !turnstileContainerRef.current) {
        setTimeout(tryRender, 200)
        return
      }
      if (turnstileWidgetRef.current) return
      turnstileWidgetRef.current = ts.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: token => setTurnstileToken(token),
        'error-callback': () => setTurnstileToken(''),
        'expired-callback': () => setTurnstileToken(''),
      })
    }
    tryRender()
    return () => {
      cancelled = true
      const ts = typeof window !== 'undefined' ? window.turnstile : null
      if (ts && turnstileWidgetRef.current) {
        try { ts.remove(turnstileWidgetRef.current) } catch {}
        turnstileWidgetRef.current = null
      }
    }
  }, [sent])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let token = turnstileToken
      // Force a fresh challenge if we don't have a token yet.
      if (TURNSTILE_SITE_KEY && !token && typeof window !== 'undefined' && window.turnstile && turnstileWidgetRef.current) {
        try {
          token = await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('Captcha timed out')), 10000)
            window.turnstile.execute(turnstileWidgetRef.current, {
              callback: tok => { clearTimeout(t); resolve(tok) },
              'error-callback': () => { clearTimeout(t); reject(new Error('Captcha failed')) },
            })
          })
        } catch {
          throw new Error('Could not verify you are human. Please reload and try again.')
        }
      }
      const res = await fetch(getApiUrl('/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstile_token: token }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Something went wrong')
      }
      trackContact({ source: 'contact_form' })
      setSent(true)
    } catch (err) {
      setError(err.message)
      // Reset Turnstile so the next attempt gets a fresh token.
      if (typeof window !== 'undefined' && window.turnstile && turnstileWidgetRef.current) {
        try { window.turnstile.reset(turnstileWidgetRef.current) } catch {}
        setTurnstileToken('')
      }
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
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      )}
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Contact us</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>We&apos;re happy to help — choose how you&apos;d like to reach us.</p>

      {/* Three options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 56 }}>
        <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Mail size={28} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>Email us</p>
          <a
            href="mailto:sales@edmclothes.net"
            onClick={() => trackContact({ source: 'mailto_link' })}
            style={{ fontSize: 13, color: '#666', textDecoration: 'none', borderBottom: '1px solid #ccc' }}
          >
            sales@edmclothes.net
          </a>
        </div>
        <Link href="/faq" style={{ background: '#f5f5f3', borderRadius: 16, padding: '24px 20px', textAlign: 'center', textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><HelpCircle size={28} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>FAQ</p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Find quick answers</p>
        </Link>
        <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Clock size={28} strokeWidth={1.5} /></div>
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><CheckCircle2 size={32} strokeWidth={1.5} color="#16a34a" /></div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: '#15803d' }}>Message sent!</p>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>We&apos;ll get back to you within 1–2 business days. Check your inbox for a confirmation.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Honeypot — hidden from humans (off-screen + aria-hidden + autocomplete off).
              Bots that blindly fill every input will set this, and the server drops the message. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
            <label>
              Website
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={set('website')}
              />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Name *</label>
              <input id="contact-name" name="name" value={form.name} onChange={set('name')} required placeholder="Your name" style={input} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Email *</label>
              <input id="contact-email" name="email" type="email" value={form.email} onChange={set('email')} required placeholder="Your email" style={input} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Subject</label>
            <input id="contact-subject" name="subject" value={form.subject} onChange={set('subject')} placeholder="What is this about?" style={input} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Message *</label>
            <textarea
              id="contact-message"
              name="message"
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

          {/* Invisible Turnstile widget — Cloudflare injects the challenge here. */}
          <div ref={turnstileContainerRef} />

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

          {TURNSTILE_SITE_KEY && (
            <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
              Protected by Cloudflare Turnstile.
            </p>
          )}
        </form>
      )}
    </main>
  )
}
