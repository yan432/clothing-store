import ContactPage from '../../contact/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Контакти',
  alternates: localizedAlternates('/contact', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianContactPage() {
  return <ContactPage locale="uk" />
}
