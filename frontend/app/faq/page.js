import { getApiUrl } from '../lib/api'

export const revalidate = 60

export const metadata = {
  title: 'FAQ — EDM Clothes',
  description: 'Frequently asked questions about orders, shipping, returns and more.',
}

function normaliseFaqHtml(html) {
  if (!html || !html.includes('<div class="faq-item">')) return html
  return html.replace(
    /<div class="faq-item"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g,
    (_, q, a) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`
  )
}

async function getFaqHtml() {
  try {
    const res = await fetch(getApiUrl('/faq'), { next: { revalidate: 60 } })
    if (!res.ok) return ''
    const d = await res.json()
    if (d && typeof d.html === 'string') return normaliseFaqHtml(d.html)
    return ''
  } catch { return '' }
}

export default async function FaqPage() {
  const html = await getFaqHtml()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>FAQ</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Frequently asked questions — find quick answers below.</p>

      {html
        ? <div className="faq-content" dangerouslySetInnerHTML={{ __html: html }} />
        : <p style={{ color: '#aaa', fontSize: 14 }}>No FAQ items yet.</p>
      }

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
