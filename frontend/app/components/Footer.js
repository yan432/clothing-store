export default function Footer() {
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
      <div style={{maxWidth:1200,margin:'0 auto',padding:'60px 24px 40px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1.3fr',gap:48}}>

        {/* Brand */}
        <div>
          <p style={{fontSize:20,fontWeight:700,letterSpacing:'0.15em',margin:'0 0 16px'}}>STORE</p>
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
          <div style={{display:'flex'}}>
            <input type="email" placeholder="Your email"
  style={{
    flex:1,padding:'11px 16px',background:'#1a1a1a',
    borderTop:'1px solid #2a2a2a',
    borderBottom:'1px solid #2a2a2a',
    borderLeft:'1px solid #2a2a2a',
    borderRight:'none',
    borderRadius:'8px 0 0 8px',
    color:'#fff',fontSize:13,outline:'none'
  }}/>
  <button style={{padding:'11px 18px',background:'#fff',color:'#000',border:'none',borderRadius:'0 8px 8px 0',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div style={{borderTop:'1px solid #1a1a1a',maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:'#444',marginRight:4}}>We accept</span>
            {/* Visa */}
            <div style={{background:'#fff',borderRadius:6,padding:'4px 10px',display:'flex',alignItems:'center'}}>
              <svg width="38" height="14" viewBox="0 0 38 14" fill="none">
                <path d="M14.5 1L11.5 13H8.5L11.5 1H14.5Z" fill="#1A1F71"/>
                <path d="M25 1.3C24.4 1.1 23.4 0.9 22.2 0.9C19.2 0.9 17.1 2.4 17.1 4.6C17.1 6.2 18.6 7.1 19.7 7.6C20.8 8.1 21.2 8.4 21.2 8.9C21.2 9.6 20.3 9.9 19.5 9.9C18.4 9.9 17.8 9.7 16.9 9.3L16.5 9.1L16.1 11.7C16.8 12 18 12.3 19.3 12.3C22.5 12.3 24.5 10.8 24.5 8.4C24.5 7.1 23.7 6.1 21.9 5.3C20.9 4.8 20.3 4.5 20.3 3.9C20.3 3.4 20.9 2.9 22.1 2.9C23.1 2.9 23.8 3.1 24.4 3.3L24.7 3.4L25 1.3Z" fill="#1A1F71"/>
                <path d="M29.5 1H27.2C26.5 1 26 1.2 25.7 1.9L21.5 13H24.7L25.3 11.3H29.2L29.5 13H32.5L29.5 1ZM26.2 9C26.5 8.2 27.6 5.3 27.6 5.3C27.6 5.3 27.9 4.5 28.1 4L28.3 5.3C28.3 5.3 29 8.5 29.1 9H26.2Z" fill="#1A1F71"/>
                <path d="M6 1L3 9.2L2.7 7.7C2.1 5.9 0.6 4 0 3.1L2.8 13H6L10.5 1H6Z" fill="#1A1F71"/>
                <path d="M2.5 1H0L0.1 1.6C1.3 2.7 2.4 4.5 2.7 5.9L2.4 2.1C2.3 1.4 1.9 1.1 2.5 1Z" fill="#F2AE14"/>
              </svg>
            </div>
            {/* Mastercard */}
            <div style={{background:'#fff',borderRadius:6,padding:'4px 8px',display:'flex',alignItems:'center',gap:0}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#EB001B'}}/>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#F79E1B',marginLeft:-8,opacity:0.9}}/>
            </div>
            {/* PayPal */}
            <div style={{background:'#fff',borderRadius:6,padding:'4px 10px',display:'flex',alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:700,color:'#003087'}}>Pay</span>
              <span style={{fontSize:11,fontWeight:700,color:'#009cde'}}>Pal</span>
            </div>
            {/* Klarna */}
            <div style={{background:'#FFB3C7',borderRadius:6,padding:'4px 10px',display:'flex',alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:700,color:'#000'}}>Klarna</span>
            </div>
            {/* Apple Pay */}
            <div style={{background:'#000',borderRadius:6,padding:'4px 10px',border:'1px solid #333',display:'flex',alignItems:'center',gap:4}}>
              <svg width="12" height="14" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <span style={{fontSize:11,fontWeight:600,color:'#fff'}}>Pay</span>
            </div>
          </div>

          <div style={{display:'flex',gap:20}}>
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
          © {new Date().getFullYear()} STORE. Made in Ukraine.
        </p>
      </div>
    </footer>
  )
}