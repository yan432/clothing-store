import FaqPage from '../../faq/page'
import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'FAQ',
  description: staticPageDescription('faq', 'uk'),
  alternates: localizedAlternates('/faq', 'uk'),
  openGraph: { description: staticPageDescription('faq', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianFaqPage() {
  return <FaqPage locale="uk" />
}
