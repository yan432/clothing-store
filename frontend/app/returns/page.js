import { getApiUrl } from '../lib/api'

export const revalidate = 60

export const metadata = {
  title: 'Returns & Exchanges — EDM Clothes',
  description: 'Our return and exchange policy.',
}

async function getPage() {
  try {
    const res = await fetch(getApiUrl('/pages/returns'), { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export default async function ReturnsPage() {
  const data = await getPage()
  const sections = data?.sections || []

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Returns & Exchanges</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Last updated: April 2026</p>

      {/* Quick summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 48 }}>
        {[
          { icon: '📦', label: '14-day returns', sub: 'From date of receipt' },
          { icon: '🔄', label: 'Free exchange', sub: 'On size or colour' },
          { icon: '✅', label: 'Unworn items', sub: 'With original tags' },
          { icon: '📧', label: 'Email to start', sub: 'sales@edmclothes.net' },
        ].map(({ icon, label, sub }) => (
          <div key={label} style={{ background: '#f5f5f3', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, margin: '0 0 8px' }}>{icon}</p>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px' }}>{label}</p>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #ecece8', marginBottom: 40 }} />

      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{s.title}</h2>
          <p style={{ fontSize: 15, color: '#4a4a44', lineHeight: 1.75, margin: 0 }}>{s.body}</p>
        </div>
      ))}

      <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '28px 24px', marginTop: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Still have questions?</p>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          Our team is happy to help — reach out and we'll get back to you within 1–2 business days.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/contact" style={{ background: '#0a0a0a', color: '#fff', textDecoration: 'none', padding: '11px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>Contact us</a>
          <a href="/faq" style={{ background: '#fff', color: '#111', textDecoration: 'none', padding: '11px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1.5px solid #e5e5e0' }}>FAQ</a>
        </div>
      </div>
    </main>
  )
}
