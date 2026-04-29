export const metadata = {
  title: 'Imprint — EDM Clothes',
  description: 'Legal information about EDM Clothes.',
}

export default function ImprintPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Imprint</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Legal information (Impressum)</p>

      <section style={{ marginBottom: 40, fontSize: 15, color: '#333', lineHeight: 1.8 }}>
        <p><strong>EDM Clothes</strong></p>
        <p>
          Email: <a href="mailto:sales@edmclothes.net" style={{ color: '#111', textDecoration: 'underline' }}>sales@edmclothes.net</a><br />
          Website: <a href="https://edmclothes.net" style={{ color: '#111', textDecoration: 'underline' }}>edmclothes.net</a>
        </p>
      </section>

      <section style={{ marginBottom: 40, fontSize: 15, color: '#333', lineHeight: 1.8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Dispute resolution</h2>
        <p>
          The European Commission provides a platform for online dispute resolution (ODR):{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: '#111', textDecoration: 'underline' }}>
            https://ec.europa.eu/consumers/odr
          </a>
        </p>
        <p>We are not obliged to participate in dispute resolution proceedings before a consumer arbitration board.</p>
      </section>
    </main>
  )
}
