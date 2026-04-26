'use client'

import { useState } from 'react'
import { getApiUrl } from '../lib/api'

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterMessage, setNewsletterMessage] = useState('')

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
          metadata: { placement: 'footer' },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to subscribe')
      }
      setNewsletterMessage('Thanks, you are subscribed.')
      setNewsletterEmail('')
    } catch (_) {
      setNewsletterMessage('Could not subscribe right now.')
    } finally {
      setNewsletterLoading(false)
    }
  }

  const shopLinks = [
    ['All products','/products'],
    ['New arrivals','/products?special=new'],
    ['Sale','/products?special=sale'],
    ['Tops','/products?category=Tops'],
    ['Bottoms','/products?category=Bottoms'],
    ['Outerwear','/products?category=Outerwear'],
  ]
  const careLinks = [
    ['Contact us','mailto:info@edmclothes.com'],
    ['Shipping info','/shipping'],
    ['Returns & exchanges','/returns'],
    ['Size guide','/size-guide'],
    ['FAQ','/faq'],
  ]

  return (
    <footer style={{background:'#0a0a0a',color:'#fff',marginTop:80}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'60px 24px 40px'}} className="footer-grid">

        {/* Brand */}
        <div>
          <p style={{fontSize:20,fontWeight:700,letterSpacing:'0.06em',margin:'0 0 16px'}}>edm.clothes</p>
          <p style={{fontSize:13,color:'#666',lineHeight:1.7,margin:'0 0 20px'}}>
            Minimal essentials designed for everyday wear. Made in Ukraine.
          </p>
          <div style={{display:'flex',gap:10}}>
            <a href="https://www.instagram.com/edm.clothes" target="_blank" rel="noopener noreferrer"
              style={{width:36,height:36,borderRadius:'50%',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none"/>
              </svg>
            </a>
            <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer"
              style={{width:36,height:36,borderRadius:'50%',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}}>
              <svg width="14" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Shop */}
        <div>
          <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.12em',color:'#555',textTransform:'uppercase',margin:'0 0 20px'}}>Shop</p>
          <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:12}}>
            {shopLinks.map(([label, href]) => (
              <li key={label}>
                <a href={href} className="footer-link">{label}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer care */}
        <div>
          <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.12em',color:'#555',textTransform:'uppercase',margin:'0 0 20px'}}>Customer care</p>
          <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:12}}>
            {careLinks.map(([label, href]) => (
              <li key={label}>
                <a href={href} className="footer-link">{label}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.12em',color:'#555',textTransform:'uppercase',margin:'0 0 20px'}}>Newsletter</p>
          <p style={{fontSize:13,color:'#666',lineHeight:1.6,margin:'0 0 16px'}}>
            New releases and special offers — straight to your inbox.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="footer-newsletter-form">
            <input
              type="email"
              placeholder="Your email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={newsletterLoading}
              style={{opacity: newsletterLoading ? 0.7 : 1}}
            >
              {newsletterLoading ? '...' : 'Subscribe'}
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
            <span style={{fontSize:12,color:'#555',marginRight:4,whiteSpace:'nowrap'}}>We accept</span>
            {[
              { file: 'visa.png',       alt: 'Visa' },
              { file: 'mastercard.png', alt: 'Mastercard' },
              { file: 'Maestro.png',    alt: 'Maestro' },
              { file: 'paypal.png',     alt: 'PayPal' },
              { file: 'klarna.png',     alt: 'Klarna' },
              { file: 'applepay.png',   alt: 'Apple Pay' },
              { file: 'googlepay.png',  alt: 'Google Pay' },
              { file: 'Stripe.png',     alt: 'Stripe' },
            ].map(({ file, alt }) => (
              <img key={file} src={`/payment-icons/${file}`} alt={alt} width={70} height={48} style={{display:'block',flexShrink:0}} />
            ))}
          </div>

          <div className="footer-legal-links">
            {[['Privacy Policy','/privacy'],['Terms','/terms'],['Imprint','/imprint']].map(([label, href]) => (
              <a key={label} href={href} className="footer-link" style={{fontSize:12,marginBottom:0}}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{borderTop:'1px solid #111',padding:'20px 24px',textAlign:'center'}}>
        <p style={{fontSize:12,color:'#333',margin:0}}>
          © {new Date().getFullYear()} edm.clothes. Made in Ukraine.
        </p>
      </div>
    </footer>
  )
}