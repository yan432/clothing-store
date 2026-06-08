import ReturnsPage from '../../returns/page'
import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'Повернення та обмін',
  description: staticPageDescription('returns', 'uk'),
  alternates: localizedAlternates('/returns', 'uk'),
  openGraph: { description: staticPageDescription('returns', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianReturnsPage() {
  return <ReturnsPage locale="uk" />
}
