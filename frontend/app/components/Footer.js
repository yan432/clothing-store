'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getApiUrl } from '../lib/api'
import { trackNewsletterSignup } from '../lib/track'
import { getMessages, localeFromPathname, pathForLocale, translateCategory } from '../lib/i18n'
import { collectionPathForCategory } from '../lib/collections'

const STATIC_SHOP_LINKS = [
  ['allProducts', '/products'],
  ['newArrivals', '/collections/new'],
  ['sale',         '/collections/sale'],
]

export default function Footer() {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetch(getApiUrl('/categories'))
      .then(r => r.ok ? r.json() : [])
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => {})
  }, [])

  async function handleNewsletterSubmit(e) {
    e.preventDefault()
    const email = newsletterEmail.trim().toLowerCase()
    if (!email) return
    setNewsletterLoading(true)
    setNewsletterMessage('')
    try {
      const res = await fetch(getApiUrl('/email-subscribers/capture'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'footer_newsletter',
          preferred_locale: locale,
          metadata: { placement: 'footer', preferred_locale: locale },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to subscribe')
      }
      trackNewsletterSignup({ source: 'footer_newsletter' })
      setNewsletterMessage(d.footer.subscribed)
      setNewsletterEmail('')
    } catch (_) {
      setNewsletterMessage(d.footer.subscribeError)
    } finally {
      setNewsletterLoading(false)
    }
  }

  const shopLinks = [
    ...STATIC_SHOP_LINKS.map(([key, href]) => [d.nav[key], pathForLocale(href, locale)]),
    ...categories.map(cat => [
      translateCategory(cat, locale),
      pathForLocale(collectionPathForCategory(cat) || `/products?category=${encodeURIComponent(cat)}`, locale),
    ]),
  ]
  const careLinks = [
    [d.nav.about, pathForLocale('/about', locale)],
    [d.nav.contact, pathForLocale('/contact', locale)],
    [d.nav.shipping, pathForLocale('/shipping', locale)],
    [d.nav.returns, pathForLocale('/returns', locale)],
    [d.nav.sizeGuide, pathForLocale('/size-guide', locale)],
    [d.nav.faq, pathForLocale('/faq', locale)],
  ]

  return (
    <footer style={{background:'#0a0a0a',color:'#fff',marginTop:80}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'60px 24px 40px'}} className="footer-grid">

        {/* Brand */}
        <div className="footer-brand">
          <p style={{fontSize:20,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',margin:'0 0 16px'}}>edm.clothes</p>
          <p style={{fontSize:13,color:'#bbb',lineHeight:1.7,margin:'0 0 20px'}}>
            {d.footer.tagline}
          </p>
          <div style={{display:'flex',gap:10}}>
            <a href="https://www.instagram.com/edm.clothes" target="_blank" rel="noopener noreferrer"
              aria-label="Instagram"
              style={{width:36,height:36,borderRadius:0,border:'1px solid #555',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none"/>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@edm_clothes" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
              style={{width:36,height:36,borderRadius:0,border:'1px solid #555',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}>
              <svg width="14" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
              </svg>
            </a>
            <a href="https://pinterest.com/edmclothes" target="_blank" rel="noopener noreferrer" aria-label="Pinterest"
              style={{width:36,height:36,borderRadius:0,border:'1px solid #555',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.85 6.35 9.3-.09-.79-.17-2 .04-2.86.19-.78 1.22-4.95 1.22-4.95s-.31-.62-.31-1.55c0-1.45.84-2.53 1.89-2.53.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.86 3.48-.25 1.04.52 1.89 1.55 1.89 1.86 0 3.29-1.96 3.29-4.79 0-2.5-1.8-4.25-4.37-4.25-2.98 0-4.72 2.23-4.72 4.54 0 .9.35 1.86.78 2.39.08.1.1.19.07.29-.08.34-.27 1.07-.31 1.22-.05.2-.16.24-.37.14-1.37-.64-2.23-2.64-2.23-4.25 0-3.46 2.51-6.64 7.25-6.64 3.8 0 6.76 2.71 6.76 6.34 0 3.78-2.38 6.82-5.69 6.82-1.11 0-2.16-.58-2.52-1.26 0 0-.55 2.1-.69 2.62-.25.96-.92 2.16-1.37 2.89C9.65 21.83 10.81 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Shop */}
        <div className="footer-shop">
          <p style={{fontSize:11,fontWeight:900,letterSpacing:'0.14em',color:'#aaa',textTransform:'uppercase',margin:'0 0 20px'}}>{d.footer.shop}</p>
          <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:12}}>
            {shopLinks.map(([label, href]) => (
              <li key={label}>
                <a href={href} className="footer-link">{label}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer care */}
        <div className="footer-care">
          <p style={{fontSize:11,fontWeight:900,letterSpacing:'0.14em',color:'#aaa',textTransform:'uppercase',margin:'0 0 20px'}}>{d.footer.customerCare}</p>
          <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:12}}>
            {careLinks.map(([label, href]) => (
              <li key={label}>
                <a href={href} className="footer-link">{label}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div className="footer-newsletter">
          <p style={{fontSize:11,fontWeight:900,letterSpacing:'0.14em',color:'#aaa',textTransform:'uppercase',margin:'0 0 20px'}}>{d.footer.newsletter}</p>
          <p style={{fontSize:13,color:'#bbb',lineHeight:1.5,margin:'0 0 10px',fontWeight:600}}>
            {d.footer.newsletterLead} <span style={{color:'#fff'}}>{d.footer.newsletterDiscount}</span> {d.footer.newsletterTail}
          </p>
          <p style={{fontSize:13,color:'#bbb',lineHeight:1.6,margin:'0 0 16px'}}>
            {d.footer.newsletterCopy}
          </p>
          <form onSubmit={handleNewsletterSubmit} className="footer-newsletter-form">
            <input
              type="email"
              placeholder={d.footer.emailPlaceholder}
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={newsletterLoading}
              style={{opacity: newsletterLoading ? 0.7 : 1}}
            >
              {newsletterLoading ? '...' : d.footer.signUp}
            </button>
          </form>
          <p style={{fontSize:12,color:'#888',margin:'8px 0 0',minHeight:16}}>
            {newsletterMessage || '\u00A0'}
          </p>
        </div>
      </div>

      {/* Payment methods */}
      <div style={{borderTop:'1px solid #1a1a1a',maxWidth:1200,margin:'0 auto',padding:'24px 24px'}}>
        <div className="footer-bottom-row">

          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:'#aaa',marginRight:4,whiteSpace:'nowrap'}}>{d.footer.accept}</span>
            {[
              { file: 'Visa.png',       alt: 'Visa' },
              { file: 'Mastercard.png', alt: 'Mastercard' },
              { file: 'Maestro.png',    alt: 'Maestro' },
              { file: 'PayPal.png',     alt: 'PayPal' },
              { file: 'Klarna.png',     alt: 'Klarna' },
              { file: 'ApplePay.png',   alt: 'Apple Pay' },
              { file: 'GooglePay.png',  alt: 'Google Pay' },
              { file: 'Stripe.png',     alt: 'Stripe' },
            ].map(({ file, alt }) => (
              <img key={file} src={`/payment-icons/${file}`} alt={alt} width={38} height={26} style={{display:'block',flexShrink:0}} />
            ))}
          </div>

          <div className="footer-legal-links">
            {[[d.footer.privacy,'/privacy'],[d.footer.terms,'/terms'],[d.footer.imprint,'/imprint']].map(([label, href]) => (
              <a key={label} href={pathForLocale(href, locale)} className="footer-link" style={{fontSize:12,marginBottom:0}}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{borderTop:'1px solid #111',padding:'20px 24px',textAlign:'center'}}>
        <p style={{fontSize:12,color:'#888',margin:0}}>
          © {new Date().getFullYear()} edm.clothes. {d.footer.made}
        </p>
      </div>
    </footer>
  )
}
