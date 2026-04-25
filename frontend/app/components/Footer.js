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

          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:'#555',marginRight:4,whiteSpace:'nowrap'}}>We accept</span>

            {/* Visa */}
            <div style={{background:'#fff',borderRadius:6,padding:'5px 10px',height:32,display:'flex',alignItems:'center',boxSizing:'border-box'}}>
              <svg width="40" height="13" viewBox="0 0 40 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.3 0.6L14.1 12.4H11.3L14.5 0.6H17.3Z" fill="#1A1F71"/>
                <path d="M28.8 0.9C28.2 0.7 27.2 0.4 25.9 0.4C23.1 0.4 21.1 1.8 21.1 3.9C21.1 5.4 22.5 6.2 23.6 6.7C24.7 7.2 25.1 7.5 25.1 8C25.1 8.8 24.1 9.1 23.2 9.1C22 9.1 21.3 8.9 20.4 8.5L20 8.3L19.5 10.8C20.2 11.1 21.5 11.4 22.9 11.4C25.9 11.4 27.9 10 27.9 7.7C27.9 6.5 27.1 5.5 25.4 4.7C24.4 4.2 23.8 3.9 23.8 3.4C23.8 2.9 24.4 2.4 25.6 2.4C26.5 2.4 27.2 2.6 27.7 2.8L28 2.9L28.8 0.9Z" fill="#1A1F71"/>
                <path d="M32.8 0.6H30.7C30 0.6 29.5 0.8 29.2 1.5L25.3 12.4H28.3L28.9 10.7H32.5L32.8 12.4H35.5L32.8 0.6ZM29.7 8.4C29.9 7.7 31 4.9 31 4.9C31 4.9 31.3 4.1 31.5 3.6L31.7 4.8C31.7 4.8 32.3 7.8 32.5 8.4H29.7Z" fill="#1A1F71"/>
                <path d="M8.8 0.6L6 8.4L5.7 7C5.1 5.2 3.5 3.3 1.8 2.3L4.4 12.4H7.5L12 0.6H8.8Z" fill="#1A1F71"/>
                <path d="M3.5 0.6H0.1L0.1 0.8C2.7 1.5 4.5 3 5.1 4.9L4.4 1.5C4.3 0.8 3.9 0.6 3.5 0.6Z" fill="#FAA61A"/>
              </svg>
            </div>

            {/* Mastercard */}
            <div style={{background:'#fff',borderRadius:6,padding:'5px 8px',height:32,display:'flex',alignItems:'center',boxSizing:'border-box'}}>
              <svg width="36" height="22" viewBox="0 0 36 22" fill="none">
                <circle cx="13" cy="11" r="9" fill="#EB001B"/>
                <circle cx="23" cy="11" r="9" fill="#F79E1B"/>
                <path d="M18 4.3A9 9 0 0 1 22.7 11 9 9 0 0 1 18 17.7 9 9 0 0 1 13.3 11 9 9 0 0 1 18 4.3Z" fill="#FF5F00"/>
              </svg>
            </div>

            {/* PayPal */}
            <div style={{background:'#fff',borderRadius:6,padding:'5px 10px',height:32,display:'flex',alignItems:'center',boxSizing:'border-box'}}>
              <svg width="52" height="14" viewBox="0 0 52 14" fill="none">
                <path d="M8.8 1H5.1C4.8 1 4.6 1.2 4.5 1.5L3 11.2C3 11.4 3.1 11.6 3.3 11.6H5.1C5.4 11.6 5.6 11.4 5.7 11.1L6.1 8.5C6.2 8.2 6.4 8 6.7 8H7.9C10.3 8 11.7 6.8 12.1 4.5C12.3 3.5 12.1 2.7 11.6 2.1C11 1.4 10.1 1 8.8 1ZM9.2 4.7C9 6 8 6 7.1 6H6.5L7 3.2H7.7C8.2 3.2 8.7 3.2 9 3.5C9.2 3.7 9.3 4.1 9.2 4.7Z" fill="#009CDE"/>
                <path d="M8.8 1H5.1C4.8 1 4.6 1.2 4.5 1.5L3 11.2C3 11.4 3.1 11.6 3.3 11.6H5.1C5.4 11.6 5.6 11.4 5.7 11.1L6.1 8.5C6.2 8.2 6.4 8 6.7 8H7.9C10.3 8 11.7 6.8 12.1 4.5C12.3 3.5 12.1 2.7 11.6 2.1C11 1.4 10.1 1 8.8 1Z" fill="#003087"/>
                <path d="M19.8 4.6H18C17.8 4.6 17.6 4.7 17.5 4.9L17.4 5.5L17.2 5.2C16.7 4.5 15.6 4.3 14.5 4.3C12 4.3 10 6.1 9.6 8.6C9.4 9.8 9.7 11 10.4 11.8C11 12.5 11.9 12.8 12.9 12.8C14.9 12.8 16 11.6 16 11.6L15.9 12.2C15.9 12.4 16 12.6 16.2 12.6H17.8C18.1 12.6 18.3 12.4 18.4 12.1L19.4 5.2C19.5 4.9 19.2 4.6 19.8 4.6ZM16.5 8.7C16.3 9.9 15.4 10.7 14.2 10.7C13.6 10.7 13.2 10.5 12.9 10.2C12.6 9.8 12.5 9.3 12.6 8.7C12.8 7.5 13.8 6.7 14.9 6.7C15.5 6.7 15.9 6.9 16.2 7.2C16.5 7.6 16.6 8.1 16.5 8.7Z" fill="#009CDE"/>
                <path d="M28 4.6H26.2C26 4.6 25.8 4.7 25.7 4.9L23.3 8.6L22.3 5C22.2 4.8 22 4.6 21.7 4.6H20C19.8 4.6 19.6 4.8 19.7 5L21.6 11.3L19.8 13.8C19.7 14 19.8 14.3 20.1 14.3H21.9C22.1 14.3 22.3 14.2 22.4 14L28.3 5.1C28.5 4.9 28.3 4.6 28 4.6Z" fill="#003087"/>
                <path d="M34.3 1H30.6C30.3 1 30.1 1.2 30 1.5L28.5 11.2C28.5 11.4 28.6 11.6 28.8 11.6H30.7C30.9 11.6 31.1 11.4 31.1 11.2L31.6 8.5C31.7 8.2 31.9 8 32.2 8H33.4C35.8 8 37.2 6.8 37.6 4.5C37.8 3.5 37.6 2.7 37.1 2.1C36.5 1.4 35.5 1 34.3 1ZM34.7 4.7C34.5 6 33.5 6 32.5 6H32L32.5 3.2H33.2C33.7 3.2 34.2 3.2 34.4 3.5C34.6 3.7 34.7 4.1 34.7 4.7Z" fill="#003087"/>
                <path d="M44.3 4.6H42.5C42.3 4.6 42.1 4.7 42 4.9L41.9 5.5L41.7 5.2C41.2 4.5 40.1 4.3 39 4.3C36.5 4.3 34.5 6.1 34.1 8.6C33.9 9.8 34.2 11 34.9 11.8C35.5 12.5 36.4 12.8 37.4 12.8C39.4 12.8 40.5 11.6 40.5 11.6L40.4 12.2C40.4 12.4 40.5 12.6 40.7 12.6H42.3C42.6 12.6 42.8 12.4 42.9 12.1L43.9 5.2C44 4.9 43.7 4.6 44.3 4.6ZM41 8.7C40.8 9.9 39.9 10.7 38.7 10.7C38.1 10.7 37.7 10.5 37.4 10.2C37.1 9.8 37 9.3 37.1 8.7C37.3 7.5 38.3 6.7 39.4 6.7C40 6.7 40.4 6.9 40.7 7.2C41 7.6 41.1 8.1 41 8.7Z" fill="#009CDE"/>
                <path d="M46.3 1.2L44.7 11.2C44.7 11.4 44.8 11.6 45 11.6H46.6C46.9 11.6 47.1 11.4 47.2 11.1L48.7 1.4C48.7 1.2 48.6 1 48.4 1H46.6C46.4 1 46.3 1.1 46.3 1.2Z" fill="#009CDE"/>
              </svg>
            </div>

            {/* Klarna */}
            <div style={{background:'#FFB3C7',borderRadius:6,padding:'5px 10px',height:32,display:'flex',alignItems:'center',boxSizing:'border-box'}}>
              <svg width="44" height="12" viewBox="0 0 44 12" fill="none">
                <path d="M6.2 0H4.4V12H6.2V0Z" fill="#000"/>
                <path d="M10.2 0H8.4C8.4 2.2 7.4 4.2 5.7 5.5L5 6L8.6 12H10.7L7.4 6.8C9.1 5.3 10.2 3.2 10.2 0Z" fill="#000"/>
                <path d="M13.8 9.6C13.1 9.6 12.6 10.2 12.6 10.8C12.6 11.5 13.1 12 13.8 12C14.5 12 15 11.5 15 10.8C15 10.1 14.5 9.6 13.8 9.6Z" fill="#000"/>
                <path d="M22.6 3.6C21.9 3.6 21.2 3.8 20.7 4.4V3.8H19V12H20.8V7.6C20.8 6.5 21.5 5.9 22.4 5.9C23.4 5.9 24 6.5 24 7.6V12H25.8V7.1C25.8 5.1 24.4 3.6 22.6 3.6Z" fill="#000"/>
                <path d="M30.8 3.6C29 3.6 27.5 5.1 27.5 7.9C27.5 10.7 29 12.2 30.8 12.2C31.7 12.2 32.4 11.8 32.9 11.2V12H34.7V3.8H32.9V4.6C32.4 4 31.7 3.6 30.8 3.6ZM31.1 10.5C30 10.5 29.3 9.6 29.3 7.9C29.3 6.2 30 5.3 31.1 5.3C32.2 5.3 32.9 6.2 32.9 7.9C32.9 9.6 32.2 10.5 31.1 10.5Z" fill="#000"/>
                <path d="M37.3 5.1V3.8H35.5V12H37.3V8.2C37.3 7 38 6.4 39 6.4H39.1V3.7C38.2 3.7 37.6 4.2 37.3 5.1Z" fill="#000"/>
                <path d="M43.3 3.6C42.4 3.6 41.7 4 41.2 4.6V3.8H39.4V12H41.2V7.6C41.2 6.5 41.9 5.9 42.8 5.9C43.8 5.9 44.4 6.5 44.4 7.6V12H46.2V7.1C46.2 5.1 44.8 3.6 43.3 3.6Z" fill="#000"/>
              </svg>
            </div>

            {/* Apple Pay */}
            <div style={{background:'#000',borderRadius:6,padding:'5px 10px',height:32,display:'flex',alignItems:'center',gap:5,boxSizing:'border-box',border:'1px solid #333'}}>
              <svg width="13" height="16" viewBox="0 0 13 16" fill="white">
                <path d="M10.7 8.5c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.5-1.7-3-1.7-1.3-.1-2.5.7-3.1.7-.6 0-1.6-.7-2.7-.7C2.2 3.7.5 4.8.5 7c0 1.4.5 2.8 1.2 3.8.7 1 1.3 1.8 2.2 1.8.9 0 1.2-.6 2.3-.6s1.4.6 2.3.6c1 0 1.6-.9 2.2-1.8.4-.6.6-1.2.7-1.3-.1 0-2.7-1-2.7-3.5zM8.6 2.3C9.2 1.6 9.5.7 9.4 0c-.8.1-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.3.9.1 1.7-.4 2.3-1.2z"/>
              </svg>
              <span style={{fontSize:12,fontWeight:600,color:'#fff',letterSpacing:'-0.2px'}}>Pay</span>
            </div>

            {/* Google Pay */}
            <div style={{background:'#fff',borderRadius:6,padding:'5px 10px',height:32,display:'flex',alignItems:'center',boxSizing:'border-box'}}>
              <svg width="38" height="16" viewBox="0 0 38 16" fill="none">
                <path d="M17.6 8.2V12h-1.3V2h3.4c.8 0 1.6.3 2.2.8.6.5.9 1.3.9 2.1 0 .8-.3 1.6-.9 2.1-.6.5-1.3.8-2.2.8h-2.1zm0-5v3.7h2.2c.5 0 .9-.2 1.3-.5.3-.3.5-.8.5-1.3s-.2-1-.5-1.3c-.3-.4-.8-.6-1.3-.6h-2.2z" fill="#5F6368"/>
                <path d="M26.4 5c1 0 1.7.3 2.3.8.6.5.8 1.2.8 2.1V12h-1.2v-.9h-.1c-.6.8-1.3 1.1-2.2 1.1-.8 0-1.4-.2-2-.7-.5-.5-.8-1.1-.8-1.8 0-.7.3-1.3.8-1.7.5-.4 1.2-.6 2.1-.6.8 0 1.4.1 1.9.4v-.3c0-.5-.2-.9-.6-1.3-.4-.3-.8-.5-1.3-.5-.8 0-1.4.3-1.8 1l-1.1-.7c.6-1 1.6-1.5 3.2-1.5zm-1.9 5.7c0 .4.2.7.5.9.3.2.7.3 1.1.3.6 0 1.1-.2 1.6-.6.4-.4.7-.9.7-1.4-.5-.4-1.1-.5-1.9-.5-.6 0-1.1.1-1.5.4-.3.3-.5.6-.5.9z" fill="#5F6368"/>
                <path d="M36.8 5.2L32.9 14h-1.3l1.4-3.1L30.1 5.2h1.4l1.9 4.7h.1l1.9-4.7h1.4z" fill="#5F6368"/>
                <path d="M12.1 7.6c0-.4 0-.8-.1-1.2H6.3v2.3h3.2c-.1.8-.6 1.5-1.2 1.9v1.6h2c1.2-1.1 1.8-2.7 1.8-4.6z" fill="#4285F4"/>
                <path d="M6.3 13.2c1.6 0 3-.5 4-1.4L8.3 10.2c-.5.4-1.2.6-2 .6-1.5 0-2.8-1-3.3-2.4H.9v1.6c1 2 3.1 3.2 5.4 3.2z" fill="#34A853"/>
                <path d="M3 8.4c-.1-.4-.2-.7-.2-1.1s.1-.8.2-1.1V4.6H.9C.3 5.7 0 7 0 8.4s.3 2.7.9 3.8L3 10.6V8.4z" fill="#FBBC04"/>
                <path d="M6.3 3.9c.9 0 1.7.3 2.3.9l1.7-1.7C9.3 2.1 7.9 1.6 6.3 1.6 4 1.6 1.9 2.8.9 4.6l2.1 1.6c.5-1.4 1.8-2.3 3.3-2.3z" fill="#EA4335"/>
              </svg>
            </div>

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