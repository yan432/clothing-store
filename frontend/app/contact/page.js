'use client'
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { Mail, HelpCircle, Clock, CheckCircle2 } from 'lucide-react'
import { getApiUrl } from '../lib/api'
import { trackContact } from '../lib/track'
import { pathForLocale } from '../lib/i18n'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

const CONTACT_COPY = {
  en: {
    title: 'Contact us',
    lead: "We're happy to help. Choose how you'd like to reach us.",
    emailUs: 'Email us',
    faq: 'FAQ',
    faqSub: 'Find quick answers',
    hours: 'Working hours',
    hoursLine: 'Mon-Fri, 8:00 am - 4:00 pm',
    reply: 'Reply within 1-2 business days',
    sendMessage: 'Send a message',
    sentTitle: 'Message sent!',
    sentText: "We'll get back to you within 1-2 business days. Check your inbox for a confirmation.",
    name: 'Name *',
    namePlaceholder: 'Your name',
    email: 'Email *',
    emailPlaceholder: 'Your email',
    subject: 'Subject',
    subjectPlaceholder: 'What is this about?',
    message: 'Message *',
    messagePlaceholder: "Tell us what's on your mind...",
    sending: 'Sending...',
    send: 'Send message',
    protected: 'Protected by Cloudflare Turnstile.',
    captchaTimeout: 'Captcha timed out',
    captchaFailed: 'Captcha failed',
    captchaError: 'Could not verify you are human. Please reload and try again.',
    genericError: 'Something went wrong',
  },
  uk: {
    title: 'Контакти',
    lead: 'Ми поруч, якщо потрібна допомога із замовленням, розміром або доставкою.',
    emailUs: 'Написати на email',
    faq: 'FAQ',
    faqSub: 'Швидкі відповіді',
    hours: 'Години роботи',
    hoursLine: 'Пн-Пт, 8:00-16:00',
    reply: 'Відповідаємо протягом 1-2 робочих днів',
    sendMessage: 'Написати повідомлення',
    sentTitle: 'Повідомлення надіслано!',
    sentText: 'Ми відповімо протягом 1-2 робочих днів. Перевір email, там буде підтвердження.',
    name: 'Ім’я *',
    namePlaceholder: 'Твоє ім’я',
    email: 'Email *',
    emailPlaceholder: 'Твій email',
    subject: 'Тема',
    subjectPlaceholder: 'Про що це?',
    message: 'Повідомлення *',
    messagePlaceholder: 'Напиши, з чим потрібна допомога...',
    sending: 'Надсилаємо...',
    send: 'Надіслати',
    protected: 'Захищено Cloudflare Turnstile.',
    captchaTimeout: 'Час перевірки вичерпано',
    captchaFailed: 'Перевірка не вдалася',
    captchaError: 'Не вдалося підтвердити, що ти людина. Онови сторінку та спробуй ще раз.',
    genericError: 'Щось пішло не так',
  },
}

export default function ContactPage({ locale = 'en' }) {
  const t = CONTACT_COPY[locale === 'uk' ? 'uk' : 'en']
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
            const timer = setTimeout(() => reject(new Error(t.captchaTimeout)), 10000)
            window.turnstile.execute(turnstileWidgetRef.current, {
              callback: tok => { clearTimeout(timer); resolve(tok) },
              'error-callback': () => { clearTimeout(timer); reject(new Error(t.captchaFailed)) },
            })
          })
        } catch {
          throw new Error(t.captchaError)
        }
      }
      const res = await fetch(getApiUrl('/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, preferred_locale: locale, turnstile_token: token }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || t.genericError)
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
    padding: '13px 16px', borderRadius: 0,
    border: '1px solid #0a0a0a', fontSize: 15,
    outline: 'none', background: '#fff',
    fontFamily: 'inherit',
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      )}
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t.title}</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>{t.lead}</p>

      {/* Three options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 56 }}>
        <div style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Mail size={28} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>{t.emailUs}</p>
          <a
            href="mailto:sales@edmclothes.net"
            onClick={() => trackContact({ source: 'mailto_link' })}
            style={{ fontSize: 13, color: '#666', textDecoration: 'none', borderBottom: '1px solid #ccc' }}
          >
            sales@edmclothes.net
          </a>
        </div>
        <Link href={pathForLocale('/faq', locale)} style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, padding: '24px 20px', textAlign: 'center', textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><HelpCircle size={28} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>{t.faq}</p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{t.faqSub}</p>
        </Link>
        <div style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Clock size={28} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>{t.hours}</p>
          <p style={{ fontSize: 13, color: '#666', margin: '0 0 4px' }}>{t.hoursLine}</p>
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>{t.reply}</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #0a0a0a', marginBottom: 40 }} />

      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 24px' }}>{t.sendMessage}</h2>

      {sent ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 0, padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><CheckCircle2 size={32} strokeWidth={1.5} color="#16a34a" /></div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: '#15803d' }}>{t.sentTitle}</p>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>{t.sentText}</p>
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>{t.name}</label>
              <input id="contact-name" name="name" value={form.name} onChange={set('name')} required placeholder={t.namePlaceholder} style={input} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>{t.email}</label>
              <input id="contact-email" name="email" type="email" value={form.email} onChange={set('email')} required placeholder={t.emailPlaceholder} style={input} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>{t.subject}</label>
            <input id="contact-subject" name="subject" value={form.subject} onChange={set('subject')} placeholder={t.subjectPlaceholder} style={input} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>{t.message}</label>
            <textarea
              id="contact-message"
              name="message"
              value={form.message}
              onChange={set('message')}
              required
              rows={6}
              placeholder={t.messagePlaceholder}
              style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #dc2626', borderRadius: 0, padding: '10px 16px', fontSize: 14, color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Invisible Turnstile widget — Cloudflare injects the challenge here. */}
          <div ref={turnstileContainerRef} />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#0a0a0a', color: '#fff', border: '1px solid #0a0a0a',
              padding: '14px 32px', borderRadius: 0, fontSize: 14,
              fontWeight: 800, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1, alignSelf: 'flex-start',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            {loading ? t.sending : t.send}
          </button>

          {TURNSTILE_SITE_KEY && (
            <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
              {t.protected}
            </p>
          )}
        </form>
      )}
    </main>
  )
}
