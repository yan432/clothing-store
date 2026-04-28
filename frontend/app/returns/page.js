export const metadata = {
  title: 'Returns & Exchanges — EDM Clothes',
  description: 'Learn about our return and exchange policy.',
}

export default function ReturnsPage() {
  const section = (title, children) => (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.01em' }}>{title}</h2>
      {children}
    </div>
  )

  const p = (text, style = {}) => (
    <p style={{ fontSize: 15, color: '#4a4a44', lineHeight: 1.75, margin: '0 0 10px', ...style }}>{text}</p>
  )

  const li = (items) => (
    <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 15, color: '#4a4a44', lineHeight: 1.75, marginBottom: 4 }}>{item}</li>
      ))}
    </ul>
  )

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>

      {/* Header */}
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Returns & Exchanges</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Last updated: May 2025</p>

      {/* Quick summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 48 }}>
        {[
          { icon: '📦', label: '14-day returns', sub: 'from date of receipt' },
          { icon: '🔄', label: 'Free exchange', sub: 'on size or colour' },
          { icon: '✅', label: 'Unworn items', sub: 'with original tags' },
          { icon: '📧', label: 'Email to start', sub: 'sales@edmclothes.net' },
        ].map(({ icon, label, sub }) => (
          <div key={label} style={{ background: '#f5f5f3', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 26, margin: '0 0 8px' }}>{icon}</p>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px' }}>{label}</p>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #ecece8', marginBottom: 40 }} />

      {section('Return eligibility', <>
        {p('We accept returns within 14 days of the delivery date, provided the item meets the following conditions:')}
        {li([
          'Item is unworn, unwashed and undamaged',
          'Original tags are still attached',
          'Item is in its original packaging (if applicable)',
          'Proof of purchase (order number or receipt) is included',
        ])}
        {p('Items marked as Final Sale, custom-made, or discounted by more than 50% are not eligible for return.')}
      </>)}

      {section('How to return', <>
        {p('To start a return or exchange, follow these steps:')}
        {li([
          'Email us at sales@edmclothes.net with your order number and reason for return',
          'Wait for our confirmation and return instructions (usually within 1–2 business days)',
          'Pack the item securely and send it to the address we provide',
          'Once we receive and inspect the item, we\'ll process your refund or exchange',
        ])}
        {p('Please do not send items back without contacting us first — we may not be able to match unsolicited parcels to your order.')}
      </>)}

      {section('Exchanges', <>
        {p('We offer free exchanges for a different size or colour of the same item, subject to availability. If the item you want is out of stock, we\'ll issue a full refund instead.')}
        {p('To request an exchange, include your preferred size or colour when you contact us to initiate the return.')}
      </>)}

      {section('Refunds', <>
        {p('Once your return is received and approved, your refund will be processed to the original payment method within 5–10 business days. You\'ll receive an email confirmation when it\'s done.')}
        {p('Original shipping costs are non-refundable unless the return is due to our error (wrong item, defective product).')}
      </>)}

      {section('Damaged or incorrect items', <>
        {p('If you received a damaged, defective, or incorrect item, please contact us within 48 hours of delivery. Include your order number and a photo of the issue — we\'ll make it right as quickly as possible at no cost to you.')}
      </>)}

      {section('Return shipping', <>
        {p('Return shipping costs are the customer\'s responsibility unless the return is due to our error. We recommend using a tracked shipping service, as we cannot be held responsible for returns lost in transit.')}
      </>)}

      {/* Contact */}
      <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '28px 24px', marginTop: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Still have questions?</p>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          Our team is happy to help — reach out and we'll get back to you within 1–2 business days.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/contact" style={{
            background: '#0a0a0a', color: '#fff', textDecoration: 'none',
            padding: '11px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          }}>Contact us</a>
          <a href="/faq" style={{
            background: '#fff', color: '#111', textDecoration: 'none',
            padding: '11px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            border: '1.5px solid #e5e5e0',
          }}>FAQ</a>
        </div>
      </div>

    </main>
  )
}
