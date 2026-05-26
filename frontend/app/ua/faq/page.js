import FaqPage from '../../faq/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'FAQ',
  alternates: localizedAlternates('/faq', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianFaqPage() {
  return <FaqPage locale="uk" />
}
