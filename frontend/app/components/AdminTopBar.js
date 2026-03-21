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
      <a href="/admin/products" style={linkStyle('products')}>Products CMS</a>
      <a href="/admin/products/new" style={linkStyle('products-new')}>New Product</a>
      <a href="/upload" style={linkStyle('upload')}>Upload</a>
    </div>
  )
}
