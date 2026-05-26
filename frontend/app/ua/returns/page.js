import ReturnsPage from '../../returns/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Повернення та обмін',
  alternates: localizedAlternates('/returns', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianReturnsPage() {
  return <ReturnsPage locale="uk" />
}
