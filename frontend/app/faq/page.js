import { getApiUrl } from '../lib/api'
import FaqAccordion from '../components/FaqAccordion'
import { pathForLocale } from '../lib/i18n'
import { localizedAlternates } from '../lib/seo'

export const revalidate = 60

export const metadata = {
  title: 'FAQ — EDM Clothes',
  description: 'Frequently asked questions about orders, shipping, returns and more.',
  alternates: localizedAlternates('/faq'),
}

const UK_FAQ_HTML = `<details class="faq-item"><summary>Скільки триває доставка?</summary><p>Стандартна доставка зазвичай займає 5-10 робочих днів у межах Європи. Для міжнародних відправлень термін може бути довшим залежно від країни та роботи митниці.</p></details>
<details class="faq-item"><summary>Чи доставляєте ви за кордон?</summary><p>Так, ми відправляємо замовлення в більшість країн Європи та за її межі. Вартість доставки розраховується під час оформлення замовлення.</p></details>
<details class="faq-item"><summary>Яка політика повернення?</summary><p>Повернення можливе протягом 14 днів після отримання. Річ має бути неношеною, непраною, без пошкоджень, з оригінальними бірками та пакуванням.</p></details>
<details class="faq-item"><summary>Як відстежити замовлення?</summary><p>Після відправки ти отримаєш email з номером для відстеження. Статус також можна перевірити в акаунті, якщо замовлення було оформлене після входу.</p></details>
<details class="faq-item"><summary>Чи можна змінити або скасувати замовлення?</summary><p>Ми можемо спробувати змінити або скасувати замовлення протягом першої години після оформлення. Після цього воно переходить в обробку, і зміни можуть бути недоступні.</p></details>
<details class="faq-item"><summary>Які способи оплати доступні?</summary><p>Ми приймаємо основні кредитні та дебетові картки, PayPal, Klarna, Apple Pay і Google Pay, якщо ці способи доступні у твоєму регіоні.</p></details>
<details class="faq-item"><summary>Як підібрати розмір?</summary><p>Більшість речей мають унісекс / menswear посадку. Якщо ти зазвичай носиш жіночі розміри, радимо обирати на 1-2 розміри менше або скористатися розмірною сіткою.</p></details>`

const FAQ_COPY = {
  en: {
    title: 'FAQ',
    lead: 'Frequently asked questions. Find quick answers below.',
    ctaTitle: 'Still have questions?',
    ctaText: 'Our team is available Mon-Fri, 8:00 am - 4:00 pm and will get back to you within 1-2 business days.',
    contact: 'Contact us',
  },
  uk: {
    title: 'FAQ',
    lead: 'Часті питання. Швидкі відповіді про замовлення, доставку, повернення та розміри.',
    ctaTitle: 'Залишилися питання?',
    ctaText: 'Команда відповідає з понеділка по п’ятницю, 8:00-16:00, зазвичай протягом 1-2 робочих днів.',
    contact: 'Написати нам',
  },
}

async function getFaqHtml(locale = 'en') {
  if (locale === 'uk') return UK_FAQ_HTML
  try {
    const res = await fetch(getApiUrl('/faq'), { next: { revalidate: 60 } })
    if (!res.ok) return ''
    const d = await res.json()
    if (d && typeof d.html === 'string') return d.html
    return ''
  } catch { return '' }
}

export default async function FaqPage({ locale = 'en' }) {
  const copy = FAQ_COPY[locale === 'uk' ? 'uk' : 'en']
  const html = await getFaqHtml(locale)

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{copy.title}</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>{copy.lead}</p>

      <FaqAccordion html={html} />

      {/* Contact CTA */}
      <div style={{ background: '#f5f5f3', borderRadius: 16, padding: '28px 24px', marginTop: 48 }}>
        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{copy.ctaTitle}</p>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
          {copy.ctaText}
        </p>
        <a href={pathForLocale('/contact', locale)} style={{
          display: 'inline-block', background: '#0a0a0a', color: '#fff',
          textDecoration: 'none', padding: '11px 28px', borderRadius: 999,
          fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
        }}>{copy.contact}</a>
      </div>
    </main>
  )
}
