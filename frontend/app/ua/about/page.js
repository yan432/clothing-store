import AboutPage from '../../about/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Про нас',
  alternates: localizedAlternates('/about', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianAboutPage() {
  return <AboutPage locale="uk" />
}
