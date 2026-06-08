import { getApiUrl } from '../lib/api'
import { Truck, Package, Gift, Globe } from 'lucide-react'
import { pathForLocale } from '../lib/i18n'
import { localizedAlternates } from '../lib/seo'
import { staticPageDescription } from '../lib/seoText'

export const revalidate = 60

export const metadata = {
  title: 'Shipping Info — EDM Clothes',
  description: staticPageDescription('shipping'),
  alternates: localizedAlternates('/shipping'),
}

const UK_SHIPPING_SECTIONS = [
  {
    title: 'Обробка замовлення',
    body: 'Усі замовлення обробляються протягом 1-3 робочих днів. Замовлення, оформлені у вихідні або святкові дні, переходять в обробку наступного робочого дня.',
  },
  {
    title: 'Вартість доставки',
    body: 'Вартість доставки розраховується під час оформлення замовлення залежно від країни, ваги та доступного перевізника. Для замовлень від 6200 ₴ доставка безкоштовна.',
  },
  {
    title: 'Терміни доставки',
    body: 'Стандартна доставка зазвичай займає 5-10 робочих днів у межах Європи. Міжнародна доставка може тривати довше залежно від країни призначення та роботи митниці.',
  },
  {
    title: 'Відстеження',
    body: 'Коли замовлення буде відправлено, ти отримаєш email з номером для відстеження. За ним можна перевіряти статус посилки на сайті перевізника.',
  },
  {
    title: 'Мито та податки',
    body: 'Для замовлень за межі ЄС можуть застосовуватися імпортні мита або податки. Вони оплачуються покупцем і не входять у ціну товарів або доставки на сайті.',
  },
]

const SHIPPING_COPY = {
  en: {
    title: 'Shipping Info',
    lead: 'Everything you need to know about how we ship your order.',
    summary: [
      { Icon: Truck, label: '5-10 business days', sub: 'Standard delivery' },
      { Icon: Package, label: '1-3 days processing', sub: 'Before dispatch' },
      { Icon: Gift, label: 'Free from €120', sub: 'On all orders' },
      { Icon: Globe, label: 'Worldwide', sub: 'International shipping' },
    ],
    ctaTitle: 'Questions about your order?',
    ctaText: 'Our team is happy to help with any shipping-related questions.',
    contact: 'Contact us',
    faq: 'FAQ',
  },
  uk: {
    title: 'Доставка',
    lead: 'Все, що потрібно знати про обробку, доставку та відстеження замовлення.',
    summary: [
      { Icon: Truck, label: '5-10 робочих днів', sub: 'Стандартна доставка' },
      { Icon: Package, label: '1-3 дні обробки', sub: 'Перед відправкою' },
      { Icon: Gift, label: 'Безкоштовно від 6200 ₴', sub: 'Для всіх замовлень' },
      { Icon: Globe, label: 'По всьому світу', sub: 'Міжнародна доставка' },
    ],
    ctaTitle: 'Питання щодо замовлення?',
    ctaText: 'Команда допоможе з будь-якими питаннями про доставку.',
    contact: 'Написати нам',
    faq: 'FAQ',
  },
}

async function getPage(locale = 'en') {
  if (locale === 'uk') return { sections: UK_SHIPPING_SECTIONS }
  try {
    const res = await fetch(getApiUrl('/pages/shipping'), { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export default async function ShippingPage({ locale = 'en' }) {
  const copy = SHIPPING_COPY[locale === 'uk' ? 'uk' : 'en']
  const data = await getPage(locale)
  const sections = data?.sections || []

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{copy.title}</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>{copy.lead}</p>

      {/* Quick summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 48 }}>
        {copy.summary.map(({ Icon, label, sub }) => (
          <div key={label} style={{ background: '#f5f5f3', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon size={24} strokeWidth={1.5} /></div>
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
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{copy.ctaTitle}</p>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          {copy.ctaText}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href={pathForLocale('/contact', locale)} style={{ background: '#0a0a0a', color: '#fff', textDecoration: 'none', padding: '11px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{copy.contact}</a>
          <a href={pathForLocale('/faq', locale)} style={{ background: '#fff', color: '#111', textDecoration: 'none', padding: '11px 24px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1.5px solid #e5e5e0' }}>{copy.faq}</a>
        </div>
      </div>
    </main>
  )
}
