import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'Реквізити — EDM Clothes',
  description: staticPageDescription('imprint', 'uk'),
  alternates: localizedAlternates('/imprint', 'uk'),
  openGraph: { description: staticPageDescription('imprint', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianImprintPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Реквізити</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Юридична інформація</p>

      <section style={{ marginBottom: 40, fontSize: 15, color: '#333', lineHeight: 1.8 }}>
        <p><strong>EDM Clothes</strong></p>
        <p>
          Email: <a href="mailto:sales@edmclothes.net" style={{ color: '#111', textDecoration: 'underline' }}>sales@edmclothes.net</a><br />
          Website: <a href="https://www.edmclothes.net" style={{ color: '#111', textDecoration: 'underline' }}>edmclothes.net</a>
        </p>
      </section>

      <section style={{ marginBottom: 40, fontSize: 15, color: '#333', lineHeight: 1.8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Вирішення спорів</h2>
        <p>
          Європейська Комісія надає платформу для онлайн-врегулювання спорів:{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: '#111', textDecoration: 'underline' }}>
            https://ec.europa.eu/consumers/odr
          </a>
        </p>
        <p>Ми не зобов’язані брати участь у процедурах вирішення спорів перед споживчим арбітражним органом.</p>
      </section>
    </main>
  )
}
