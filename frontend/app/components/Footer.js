'use client'

import { useState, useEffect } from 'react'
import { getApiUrl } from '../lib/api'

const PAYMENT_ICONS = [
  {
    id: 'visa', label: 'Visa',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="11" fill="#1a1f71" letterSpacing="-0.5">VISA</text>
      </svg>
    ),
  },
  {
    id: 'mastercard', label: 'Mastercard',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="13" r="8" fill="#EB001B"/>
        <circle cx="24" cy="13" r="8" fill="#F79E1B"/>
        <path d="M19 7.4a8 8 0 0 1 0 11.2A8 8 0 0 1 19 7.4z" fill="#FF5F00"/>
      </svg>
    ),
  },
  {
    id: 'maestro', label: 'Maestro',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="13" r="8" fill="#EB001B"/>
        <circle cx="24" cy="13" r="8" fill="#00A2E5"/>
        <path d="M19 7.4a8 8 0 0 1 0 11.2A8 8 0 0 1 19 7.4z" fill="#7B0099"/>
      </svg>
    ),
  },
  {
    id: 'paypal', label: 'PayPal',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="8.5" fill="#003087">Pay</text>
        <text x="50%" y="72%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="8.5" fill="#009cde">Pal</text>
      </svg>
    ),
  },
  {
    id: 'klarna', label: 'Klarna',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <rect width="38" height="26" rx="4" fill="#FFB3C7"/>
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" fill="#17120f">klarna</text>
      </svg>
    ),
  },
  {
    id: 'applepay', label: 'Apple Pay',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 8.5c.5-.6 1.1-1 1.9-1-.1.8-.4 1.5-.9 2-.5.6-1.1 1-1.9 1 0-.8.4-1.5.9-2zm-1 2.8c1 0 1.8.5 2.3.5.5 0 1.3-.6 2.3-.5.4 0 1.5.1 2.1.9-.1 0-1.3.7-1.2 2.1 0 1.6 1.4 2.2 1.4 2.2 0 .1-.2.7-.7 1.3-.4.6-.9 1.2-1.6 1.2-.7 0-.9-.4-1.7-.4s-1 .4-1.8.4c-.7 0-1.2-.6-1.7-1.2-.8-1-1.5-2.6-1.5-4.1 0-2.4 1.6-3.7 3.1-3.4z" fill="#111"/>
        <text x="22" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="7.5" fill="#111">Pay</text>
      </svg>
    ),
  },
  {
    id: 'googlepay', label: 'Google Pay',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="7" fill="#111" letterSpacing="0">G Pay</text>
      </svg>
    ),
  },
  {
    id: 'stripe', label: 'Stripe',
    svg: (
      <svg viewBox="0 0 38 26" width="38" height="26" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="10" fill="#635BFF">stripe</text>
      </svg>
    ),
  },
]

const STATIC_SHOP_LINKS = [
  ['All products', '/products'],
  ['New arrivals', '/products?special=new'],
  ['Sale',         '/products?special=sale'],
]

export default function Footer() {
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
    ...STATIC_SHOP_LINKS,
    ...categories.map(cat => [cat, `/products?category=${encodeURIComponent(cat)}`]),
  ]
  const careLinks = [
    ['About','/about'],
    ['Contact us','/contact'],
    ['Shipping info','/shipping'],
    ['Returns & exchanges','/returns'],
    ['Size guide','/size-guide'],
    ['FAQ','/faq'],
  ]

  return (
    <footer style={{background:'#0a0a0a',color:'#fff',marginTop:80}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'60px 24px 40px'}} className="footer-grid">

        {/* Brand */}
        <div className="footer-brand">
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
            <a href="https://www.tiktok.com/@edm.clothes" target="_blank" rel="noopener noreferrer" aria-hidden="true"
              style={{width:36,height:36,borderRadius:'50%',border:'1px solid #333',display:'none',alignItems:'center',justifyContent:'center',textDecoration:'none'}}>
              <svg width="14" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Shop */}
        <div className="footer-shop">
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
        <div className="footer-care">
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
        <div className="footer-newsletter">
          <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.12em',color:'#555',textTransform:'uppercase',margin:'0 0 20px'}}>Newsletter</p>
          <p style={{fontSize:13,color:'#bbb',lineHeight:1.5,margin:'0 0 10px',fontWeight:600}}>
            Sign up for our email newsletter & get <span style={{color:'#fff'}}>-10% OFF</span> your first order
          </p>
          <p style={{fontSize:13,color:'#666',lineHeight:1.6,margin:'0 0 16px'}}>
            Get early access to new arrivals, sales, exclusive content, events and more!
          </p>
          <form onSubmit={handleNewsletterSubmit} className="footer-newsletter-form">
            <input
              type="email"
              placeholder="Email address"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={newsletterLoading}
              style={{opacity: newsletterLoading ? 0.7 : 1}}
            >
              {newsletterLoading ? '...' : 'Sign up'}
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
            {PAYMENT_ICONS.map(({ id, label, svg }) => (
              <span key={id} title={label} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:38,height:26,background:'#fff',borderRadius:4,border:'1px solid #2a2a2a',flexShrink:0,overflow:'hidden'}}>
                {svg}
              </span>
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