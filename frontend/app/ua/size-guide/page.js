import SizeGuidePage from '../../size-guide/page'
import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'Розмірна сітка',
  description: staticPageDescription('sizeGuide', 'uk'),
  alternates: localizedAlternates('/size-guide', 'uk'),
  openGraph: { description: staticPageDescription('sizeGuide', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianSizeGuidePage() {
  return <SizeGuidePage locale="uk" />
}
