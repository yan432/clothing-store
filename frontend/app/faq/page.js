import FaqAccordion from '../components/FaqAccordion'
import { getApiUrl } from '../lib/api'

export const revalidate = 60

export const metadata = {
  title: 'FAQ — EDM Clothes',
  description: 'Frequently asked questions about orders, shipping, returns and more.',
}

async function getFaq() {
  try {
    const res = await fetch(getApiUrl('/faq'), { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export default async function FaqPage() {
  const items = await getFaq()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>FAQ</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Frequently asked questions — find quick answers below.</p>

      <FaqAccordion items={items} />

      {/* Contact CTA */}
      <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '28px 24px', marginTop: 48 }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Still have questions?</p>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          Our team is available Mon–Fri, 8:00 am – 4:00 pm and will get back to you within 1–2 business days.
        </p>
        <a href="/contact" style={{
          display: 'inline-block', background: '#0a0a0a', color: '#fff',
          textDecoration: 'none', padding: '11px 28px', borderRadius: 999,
          fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
        }}>Contact us</a>
      </div>
    </main>
  )
}
