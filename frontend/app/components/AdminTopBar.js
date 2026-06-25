'use client'

import Link from 'next/link'

export default function AdminTopBar({ active = 'orders' }) {
  const linkStyle = (key) => ({
    border: '1px solid #0a0a0a',
    borderRadius: 0,
    padding: '9px 12px',
    fontSize: 11,
    textDecoration: 'none',
    color: active === key ? '#fff' : '#0a0a0a',
    background: active === key ? '#0a0a0a' : '#fff',
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  })

  return (
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <Link href="/admin/orders" style={linkStyle('orders')}>Orders</Link>
      <Link href="/admin/products" style={linkStyle('products')}>Products</Link>
      <Link href="/admin/promos" style={linkStyle('promos')}>Promo Codes</Link>
      <Link href="/admin/subscribers" style={linkStyle('subscribers')}>Subscribers</Link>
      <Link href="/admin/homepage" style={linkStyle('homepage')}>Homepage</Link>
      <Link href="/admin/landing-page" style={linkStyle('landing-page')}>Landing Page</Link>
      <Link href="/admin/pages" style={linkStyle('pages')}>Static Pages</Link>
      <Link href="/admin/settings" style={linkStyle('settings')}>Settings</Link>
      <Link href="/admin/shipping" style={linkStyle('shipping')}>Shipping Rates</Link>
      <a href="https://mail.zoho.eu" target="_blank" rel="noopener noreferrer" style={linkStyle('zoho')}>Zoho Mail ↗</a>
    </div>
  )
}
