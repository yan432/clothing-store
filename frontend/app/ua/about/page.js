import AboutPage from '../../about/page'
import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'Про нас',
  description: staticPageDescription('about', 'uk'),
  alternates: localizedAlternates('/about', 'uk'),
  openGraph: { description: staticPageDescription('about', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianAboutPage() {
  return <AboutPage locale="uk" />
}
