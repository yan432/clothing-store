import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'Політика конфіденційності — EDM Clothes',
  description: staticPageDescription('privacy', 'uk'),
  alternates: localizedAlternates('/privacy', 'uk'),
  openGraph: { description: staticPageDescription('privacy', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianPrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Політика конфіденційності</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px' }}>Оновлено: травень 2026</p>

      <Section title="1. Хто ми">
        <p>EDM Clothes (&quot;ми&quot;, &quot;нас&quot;, &quot;наш&quot;) керує сайтом edmclothes.net і відповідає за обробку персональних даних, описану в цій політиці.</p>
        <p>Контакт: <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a></p>
      </Section>

      <Section title="2. Які дані ми збираємо">
        <p>Коли ти оформлюєш замовлення або взаємодієш із сайтом, ми можемо збирати такі дані:</p>
        <ul style={listStyle}>
          <li><strong>Дані замовлення:</strong> ім’я, email, адреса доставки, склад замовлення та сума оплати</li>
          <li><strong>Платіжні дані:</strong> обробляються Stripe; ми не зберігаємо дані картки</li>
          <li><strong>Дані акаунта:</strong> email, адресні дані, історія замовлень та бажана мова</li>
          <li><strong>Розсилка:</strong> email та бажана мова, якщо ти підписуєшся</li>
          <li><strong>Аналітика:</strong> переглянуті сторінки, тип пристрою, країна — лише за твоєю згодою</li>
          <li><strong>Маркетингова атрибуція:</strong> дані Meta/браузера та хешовані контактні дані для вимірювання реклами — лише за твоєю згодою</li>
        </ul>
      </Section>

      <Section title="3. Як ми використовуємо дані">
        <ul style={listStyle}>
          <li>Щоб обробляти та виконувати замовлення</li>
          <li>Щоб надсилати підтвердження замовлення, оновлення доставки та сповіщення про наявність</li>
          <li>Щоб комунікувати з тобою бажаною мовою</li>
          <li>Щоб надсилати розсилку, якщо ти дав(-ла) згоду</li>
          <li>Щоб покращувати сайт, товари та рекламні кампанії</li>
          <li>Щоб виконувати юридичні зобов’язання</li>
        </ul>
      </Section>

      <Section title="4. Правова підстава (GDPR)">
        <ul style={listStyle}>
          <li><strong>Виконання договору</strong> — обробка замовлення (ст. 6(1)(b) GDPR)</li>
          <li><strong>Законний інтерес</strong> — безпека сайту та запобігання шахрайству (ст. 6(1)(f) GDPR)</li>
          <li><strong>Згода</strong> — аналітика, маркетингові cookies, розсилка (ст. 6(1)(a) GDPR)</li>
          <li><strong>Юридичний обов’язок</strong> — податкові та бухгалтерські записи (ст. 6(1)(c) GDPR)</li>
        </ul>
      </Section>

      <Section title="5. Cookies та аналітика">
        <p>Ми використовуємо cookies і подібні технології для аналізу трафіку та покращення досвіду. Аналітичні cookies встановлюються лише після явної згоди в cookie banner.</p>
        <p>Ми використовуємо Google Analytics 4 із Consent Mode v2. Якщо cookies відхилено, GA працює без персональних ідентифікаторів.</p>
        <p>Meta Pixel і Meta Conversions API використовуються для вимірювання реклами. Якщо маркетингові cookies відхилено, серверні purchase events до Meta не надсилаються.</p>
      </Section>

      <Section title="6. Сторонні сервіси">
        <ul style={listStyle}>
          <li><strong>Stripe</strong> — обробка платежів</li>
          <li><strong>Google Analytics</strong> — вебаналітика</li>
          <li><strong>Meta</strong> — рекламна атрибуція</li>
          <li><strong>Supabase</strong> — база даних та акаунти</li>
          <li><strong>Resend / Zoho</strong> — transactional email</li>
          <li><strong>Nova Poshta / Ukr Poshta</strong> — доставка</li>
        </ul>
      </Section>

      <Section title="7. Зберігання даних">
        <ul style={listStyle}>
          <li><strong>Дані замовлень:</strong> 7 років для юридичних і податкових обов’язків</li>
          <li><strong>Дані акаунта:</strong> доки акаунт існує</li>
          <li><strong>Розсилка:</strong> доки ти не відпишешся</li>
          <li><strong>Аналітика:</strong> 14 місяців за стандартним налаштуванням Google Analytics</li>
        </ul>
      </Section>

      <Section title="8. Твої права">
        <p>За GDPR ти маєш право на доступ, виправлення, видалення, обмеження обробки, перенесення даних, заперечення проти обробки та відкликання згоди.</p>
        <p>Щоб скористатися правами, напиши на <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a>. Ми відповімо протягом 30 днів.</p>
      </Section>

      <Section title="9. Передача даних">
        <p>Деякі провайдери можуть обробляти дані за межами Європейської економічної зони. Такі передачі захищаються Standard Contractual Clauses або аналогічними гарантіями.</p>
      </Section>

      <Section title="10. Контакти та скарги">
        <p>З питаннями щодо приватності пиши на <a href="mailto:sales@edmclothes.net" style={linkStyle}>sales@edmclothes.net</a>. Також ти можеш звернутися до місцевого органу захисту даних.</p>
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
