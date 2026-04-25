export const metadata = {
  title: 'Coming Soon — EDM Clothes',
  robots: { index: false },
}

export default function MaintenancePage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fafaf8',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: '#111',
          margin: '0 0 12px',
        }}>
          We'll be back soon
        </h1>
        <p style={{
          fontSize: 15,
          color: '#888',
          lineHeight: 1.6,
          margin: '0 0 32px',
        }}>
          The store is currently undergoing maintenance.<br />
          Check back shortly.
        </p>

        <a
          href="/auth"
          style={{
            display: 'inline-block',
            fontSize: 13,
            color: '#aaa',
            textDecoration: 'none',
            borderBottom: '1px solid #ddd',
            paddingBottom: 1,
          }}
        >
          Admin login
        </a>
      </div>
    </main>
  )
}
