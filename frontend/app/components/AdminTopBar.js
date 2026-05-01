'use client'

export default function AdminTopBar({ active = 'orders' }) {
  const linkStyle = (key) => ({
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    textDecoration: 'none',
    color: active === key ? '#111' : '#444',
    background: active === key ? '#f3f3f0' : '#fff',
    fontWeight: active === key ? 600 : 500,
  })

  return (
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <a href="/admin/orders" style={linkStyle('orders')}>Orders</a>
      <a href="/admin/products" style={linkStyle('products')}>Products</a>
      <a href="/admin/promos" style={linkStyle('promos')}>Promo Codes</a>
      <a href="/admin/subscribers" style={linkStyle('subscribers')}>Subscribers</a>
      <a href="/admin/homepage" style={linkStyle('homepage')}>Homepage</a>
      <a href="/admin/pages" style={linkStyle('pages')}>Static Pages</a>
      <a href="/admin/settings" style={linkStyle('settings')}>Settings</a>
      <a href="/admin/shipping" style={linkStyle('shipping')}>Shipping Rates</a>
      <a href="https://mail.zoho.eu" target="_blank" rel="noopener noreferrer" style={linkStyle('zoho')}>Zoho Mail ↗</a>
    </div>
  )
}
