import Link from 'next/link'

export const metadata = {
  title: '404 — Page not found · EDM Clothes',
}

export default function NotFound() {
  return (
    <main style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 24px',
    }}>
      <p style={{ fontSize: 96, fontWeight: 800, margin: '0 0 0', letterSpacing: '-0.04em', color: '#f0f0ee', lineHeight: 1 }}>
        404
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '16px 0 8px', letterSpacing: '-0.01em' }}>
        Page not found
      </h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 32px', maxWidth: 340, lineHeight: 1.6 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/products"
          style={{
            background: '#111', color: '#fff',
            padding: '12px 28px', borderRadius: 999,
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Browse products
        </Link>
        <Link
          href="/"
          style={{
            background: 'transparent', color: '#111',
            padding: '12px 28px', borderRadius: 999,
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            border: '1px solid #e0e0e0',
          }}
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
