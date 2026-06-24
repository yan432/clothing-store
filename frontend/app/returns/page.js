import { getApiUrl } from '../lib/api'
import { Package, RefreshCw, CheckCircle2, Mail } from 'lucide-react'
import { pathForLocale } from '../lib/i18n'
import { localizedAlternates } from '../lib/seo'

export const revalidate = 60

export const metadata = {
  title: 'Returns & Exchanges — EDM Clothes',
  description: 'Our return and exchange policy.',
  alternates: localizedAlternates('/returns'),
}

const UK_RETURNS_SECTIONS = [
  {
    title: 'Термін повернення',
    body: 'Повернення можливе протягом 14 днів з дати отримання замовлення. Після цього терміну ми не зможемо прийняти повернення.',
  },
  {
    title: 'Умови повернення',
    body: 'Річ має бути неношеною, непраною, без пошкоджень, з оригінальними бірками та в оригінальному пакуванні. Товари з фінального розпродажу та індивідуальні замовлення не підлягають поверненню.',
  },
  {
    title: 'Як оформити повернення',
    body: 'Напиши нам на sales@edmclothes.net, вкажи номер замовлення та причину повернення. Ми надішлемо інструкції протягом 1-2 робочих днів.',
  },
  {
    title: 'Повернення коштів',
    body: 'Після отримання та перевірки повернення кошти будуть повернуті на початковий спосіб оплати протягом 5-10 робочих днів.',
  },
  {
    title: 'Обмін',
    body: 'Безкоштовний обмін доступний на інший розмір або колір того самого товару, якщо він є в наявності.',
  },
  {
    title: 'Доставка повернення',
    body: 'Вартість зворотної доставки оплачує покупець, якщо повернення не пов’язане з нашою помилкою, наприклад неправильним або дефектним товаром.',
  },
]

const RETURNS_COPY = {
  en: {
    title: 'Returns & Exchanges',
    lead: 'Last updated: April 2026',
    summary: [
      { Icon: Package, label: '14-day returns', sub: 'From date of receipt' },
      { Icon: RefreshCw, label: 'Free exchange', sub: 'On size or colour' },
      { Icon: CheckCircle2, label: 'Unworn items', sub: 'With original tags' },
      { Icon: Mail, label: 'Email to start', sub: 'sales@edmclothes.net' },
    ],
    ctaTitle: 'Still have questions?',
    ctaText: "Our team is happy to help. Reach out and we'll get back to you within 1-2 business days.",
    contact: 'Contact us',
    faq: 'FAQ',
  },
  uk: {
    title: 'Повернення та обмін',
    lead: 'Оновлено: квітень 2026',
    summary: [
      { Icon: Package, label: '14 днів', sub: 'З дати отримання' },
      { Icon: RefreshCw, label: 'Безкоштовний обмін', sub: 'На розмір або колір' },
      { Icon: CheckCircle2, label: 'Неношені речі', sub: 'З оригінальними бірками' },
      { Icon: Mail, label: 'Напиши нам', sub: 'sales@edmclothes.net' },
    ],
    ctaTitle: 'Залишилися питання?',
    ctaText: 'Напиши нам, і ми відповімо протягом 1-2 робочих днів.',
    contact: 'Написати нам',
    faq: 'FAQ',
  },
}

async function getPage(locale = 'en') {
  if (locale === 'uk') return { sections: UK_RETURNS_SECTIONS }
  try {
    const res = await fetch(getApiUrl('/pages/returns'), { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export default async function ReturnsPage({ locale = 'en' }) {
  const copy = RETURNS_COPY[locale === 'uk' ? 'uk' : 'en']
  const data = await getPage(locale)
  const sections = data?.sections || []

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{copy.title}</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>{copy.lead}</p>

      {/* Quick summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 48 }}>
        {copy.summary.map(({ Icon, label, sub }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, padding: '18px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Icon size={24} strokeWidth={1.5} /></div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px' }}>{label}</p>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #0a0a0a', marginBottom: 40 }} />

      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{s.title}</h2>
          <p style={{ fontSize: 15, color: '#4a4a44', lineHeight: 1.75, margin: 0 }}>{s.body}</p>
        </div>
      ))}

      <div style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, padding: '28px 24px', marginTop: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{copy.ctaTitle}</p>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          {copy.ctaText}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href={pathForLocale('/contact', locale)} style={{ background: '#0a0a0a', color: '#fff', textDecoration: 'none', padding: '11px 24px', borderRadius: 0, fontSize: 13, fontWeight: 800, border: '1px solid #0a0a0a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{copy.contact}</a>
          <a href={pathForLocale('/faq', locale)} style={{ background: '#fff', color: '#111', textDecoration: 'none', padding: '11px 24px', borderRadius: 0, fontSize: 13, fontWeight: 800, border: '1px solid #0a0a0a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{copy.faq}</a>
        </div>
      </div>
    </main>
  )
}
