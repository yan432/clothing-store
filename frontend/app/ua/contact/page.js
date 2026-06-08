import ContactPage from '../../contact/page'
import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'Контакти',
  description: staticPageDescription('contact', 'uk'),
  alternates: localizedAlternates('/contact', 'uk'),
  openGraph: { description: staticPageDescription('contact', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianContactPage() {
  return <ContactPage locale="uk" />
}
