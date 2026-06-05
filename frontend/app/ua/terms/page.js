import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Умови користування — EDM Clothes',
  description: 'Умови покупки та користування сайтом EDM Clothes.',
  alternates: localizedAlternates('/terms', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianTermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Умови користування</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Оновлено: квітень 2026</p>

      <Section title="1. Про нас">
        <p>Ці умови регулюють користування edmclothes.net і покупки на сайті. Оформлюючи замовлення, ти погоджуєшся з цими умовами. Контакт: <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a></p>
      </Section>

      <Section title="2. Товари">
        <p>Усі товари залежать від наявності. Ми можемо обмежувати кількість, знімати товари з продажу або виправляти помилки в цінах. Кольори на екрані можуть трохи відрізнятися від реальних.</p>
      </Section>

      <Section title="3. Ціни та оплата">
        <ul style={listStyle}>
          <li>Ціни вказані в гривні (₴) та включають застосовні податки.</li>
          <li>Вартість доставки розраховується під час checkout за напрямком і вагою.</li>
          <li>Оплата безпечно обробляється Stripe. Доступні картки, PayPal, Apple Pay, Google Pay та Klarna.</li>
          <li>Оплата списується під час оформлення замовлення.</li>
        </ul>
      </Section>

      <Section title="4. Підтвердження замовлення">
        <p>Після оформлення замовлення ти отримаєш email-підтвердження. Ми можемо скасувати замовлення через відсутність товару, помилку ціни або підозру на шахрайство. У такому випадку повернемо оплату.</p>
      </Section>

      <Section title="5. Доставка">
        <p>Ми відправляємо замовлення міжнародно через Nova Poshta та Ukr Poshta. Орієнтовні строки й вартість показуються під час checkout. Після відправлення ти отримаєш номер відстеження email-ом.</p>
      </Section>

      <Section title="6. Повернення та обмін">
        <p>Можна повернути неношені й непрані речі в оригінальному пакуванні протягом 14 днів після отримання. Деталі — на сторінці <a href="/ua/returns" style={linkStyle}>Повернення та обмін</a>.</p>
      </Section>

      <Section title="7. Інтелектуальна власність">
        <p>Весь контент сайту, включно з текстами, фото, логотипами й дизайном, належить EDM Clothes і не може бути відтворений без письмового дозволу.</p>
      </Section>

      <Section title="8. Обмеження відповідальності">
        <p>У межах, дозволених законом, EDM Clothes не відповідає за непрямі або випадкові збитки, що виникають через користування сайтом або товарами. Наша загальна відповідальність не перевищує суму відповідного замовлення.</p>
      </Section>

      <Section title="9. Застосовне право">
        <p>Ці умови регулюються застосовним законодавством. Якщо ти є споживачем у ЄС, також діють обов’язкові права захисту споживачів у країні проживання.</p>
      </Section>

      <Section title="10. Зміни">
        <p>Ми можемо оновлювати умови. Актуальна версія завжди доступна на edmclothes.net/terms.</p>
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
