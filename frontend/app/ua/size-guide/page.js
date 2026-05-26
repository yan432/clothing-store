import SizeGuidePage from '../../size-guide/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Розмірна сітка',
  alternates: localizedAlternates('/size-guide', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianSizeGuidePage() {
  return <SizeGuidePage locale="uk" />
}
