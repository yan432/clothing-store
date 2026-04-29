export const metadata = {
  title: 'Terms & Conditions — EDM Clothes',
  description: 'Terms and conditions for purchasing from EDM Clothes.',
}

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Terms & Conditions</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Last updated: April 2026</p>

      <Section title="1. About us">
        <p>These terms govern your use of edmclothes.net and any purchases made through it. By placing an order you agree to these terms. Contact: <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a></p>
      </Section>

      <Section title="2. Products">
        <p>All products are subject to availability. We reserve the right to limit quantities, discontinue products, or correct pricing errors at any time. Product images are for illustration — colours may vary slightly on screen.</p>
      </Section>

      <Section title="3. Pricing & payment">
        <ul style={listStyle}>
          <li>All prices are in Euros (€) and include applicable taxes.</li>
          <li>Shipping costs are calculated at checkout based on destination and weight.</li>
          <li>Payment is processed securely by Stripe. We accept Visa, Mastercard, Maestro, PayPal, Apple Pay, Google Pay, and Klarna.</li>
          <li>Your card is charged at the time of order.</li>
        </ul>
      </Section>

      <Section title="4. Order confirmation">
        <p>After placing an order you will receive a confirmation email. This is an acknowledgement, not a binding acceptance. We reserve the right to cancel orders due to stock issues, pricing errors, or suspected fraud — in which case you will receive a full refund.</p>
      </Section>

      <Section title="5. Shipping">
        <p>We ship internationally via Nova Poshta and Ukr Poshta. Estimated delivery times and costs are shown at checkout. Once your order is shipped you will receive a tracking number by email. We are not responsible for delays caused by customs or courier services.</p>
      </Section>

      <Section title="6. Returns & exchanges">
        <p>You may return unworn, unwashed items in original packaging within 14 days of receipt. See our <a href="/returns" style={linkStyle}>Returns & Exchanges</a> page for full details.</p>
      </Section>

      <Section title="7. Intellectual property">
        <p>All content on this website — including text, images, logos, and design — is the property of EDM Clothes and may not be reproduced without written permission.</p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>To the fullest extent permitted by law, EDM Clothes is not liable for any indirect, incidental, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the amount paid for the relevant order.</p>
      </Section>

      <Section title="9. Governing law">
        <p>These terms are governed by applicable law. Any disputes shall be resolved in good faith. If you are a consumer in the EU, you also benefit from mandatory consumer protection laws in your country of residence.</p>
      </Section>

      <Section title="10. Changes">
        <p>We may update these terms at any time. The current version is always at edmclothes.net/terms. Continued use of the site after changes constitutes acceptance.</p>
      </Section>
    </main>
  )
}

const linkStyle = { color: '#111', textDecoration: 'underline' }
const listStyle = { paddingLeft: 20, lineHeight: 1.8 }

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#333', lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}
