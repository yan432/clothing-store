export const metadata = {
  title: 'Privacy Policy — EDM Clothes',
  description: 'How EDM Clothes collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Privacy Policy</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Last updated: April 2026</p>

      <Section title="1. Who we are">
        <p>EDM Clothes ("we", "us", "our") operates the website edmclothes.net. We are responsible for the processing of your personal data as described in this policy.</p>
        <p>Contact: <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a></p>
      </Section>

      <Section title="2. What data we collect">
        <p>We collect the following personal data when you place an order or interact with our site:</p>
        <ul style={listStyle}>
          <li><strong>Order data:</strong> name, email address, shipping address, order contents and payment amount</li>
          <li><strong>Payment data:</strong> processed securely by Stripe — we never store card details</li>
          <li><strong>Account data:</strong> email address and order history if you create an account</li>
          <li><strong>Newsletter:</strong> email address if you subscribe</li>
          <li><strong>Analytics data:</strong> pages visited, device type, country — collected via Google Analytics (only with your consent)</li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <ul style={listStyle}>
          <li>To process and fulfil your orders</li>
          <li>To send order confirmations and shipping updates</li>
          <li>To send newsletters (only if you opted in; you can unsubscribe at any time)</li>
          <li>To improve our website and product offering via analytics</li>
          <li>To comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="4. Legal basis (GDPR)">
        <ul style={listStyle}>
          <li><strong>Contract performance</strong> — processing your order (Art. 6(1)(b) GDPR)</li>
          <li><strong>Legitimate interest</strong> — fraud prevention, site security (Art. 6(1)(f) GDPR)</li>
          <li><strong>Consent</strong> — analytics cookies, newsletter (Art. 6(1)(a) GDPR)</li>
          <li><strong>Legal obligation</strong> — tax and accounting records (Art. 6(1)(c) GDPR)</li>
        </ul>
      </Section>

      <Section title="5. Cookies and analytics">
        <p>We use cookies and similar technologies to analyse traffic and improve your experience. Analytics cookies are only set after you give your explicit consent via our cookie banner.</p>
        <p>We use <strong>Google Analytics 4</strong> with Consent Mode v2. If you decline cookies, GA operates in cookieless mode and no personal identifiers are stored.</p>
        <p>You can withdraw your consent at any time by clearing your browser cookies or contacting us.</p>
      </Section>

      <Section title="6. Third-party services">
        <ul style={listStyle}>
          <li><strong>Stripe</strong> — payment processing (<a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>privacy policy</a>)</li>
          <li><strong>Google Analytics</strong> — website analytics (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>privacy policy</a>)</li>
          <li><strong>Supabase</strong> — database and authentication</li>
          <li><strong>Resend / Zoho</strong> — transactional email delivery</li>
          <li><strong>Nova Poshta / Ukr Poshta</strong> — shipping (your name and address are shared for delivery)</li>
        </ul>
      </Section>

      <Section title="7. Data retention">
        <p>We retain your personal data for as long as necessary to fulfil the purposes described above:</p>
        <ul style={listStyle}>
          <li><strong>Order data:</strong> 7 years (legal / tax obligation)</li>
          <li><strong>Account data:</strong> until you delete your account</li>
          <li><strong>Newsletter:</strong> until you unsubscribe</li>
          <li><strong>Analytics:</strong> 14 months (Google Analytics default)</li>
        </ul>
      </Section>

      <Section title="8. Your rights">
        <p>Under the GDPR you have the right to:</p>
        <ul style={listStyle}>
          <li><strong>Access</strong> — request a copy of the data we hold about you</li>
          <li><strong>Rectification</strong> — ask us to correct inaccurate data</li>
          <li><strong>Erasure</strong> — ask us to delete your data ("right to be forgotten")</li>
          <li><strong>Restriction</strong> — ask us to limit how we use your data</li>
          <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
          <li><strong>Object</strong> — object to processing based on legitimate interest</li>
          <li><strong>Withdraw consent</strong> — at any time, without affecting prior processing</li>
        </ul>
        <p>To exercise any right, email us at <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a>. We will respond within 30 days.</p>
      </Section>

      <Section title="9. Data transfers">
        <p>Some of our service providers (e.g. Google, Stripe) may process data outside the European Economic Area. These transfers are covered by Standard Contractual Clauses or equivalent safeguards.</p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>We may update this policy from time to time. The latest version is always available at edmclothes.net/privacy. For significant changes we will notify you by email.</p>
      </Section>

      <Section title="11. Contact & complaints">
        <p>For any privacy-related questions, email <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a>.</p>
        <p>You also have the right to lodge a complaint with your local data protection authority.</p>
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
