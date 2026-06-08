import ShippingPage from '../../shipping/page'
import { localizedAlternates } from '../../lib/seo'
import { staticPageDescription } from '../../lib/seoText'

export const metadata = {
  title: 'Доставка',
  description: staticPageDescription('shipping', 'uk'),
  alternates: localizedAlternates('/shipping', 'uk'),
  openGraph: { description: staticPageDescription('shipping', 'uk'), locale: 'uk_UA' },
}

export default function UkrainianShippingPage() {
  return <ShippingPage locale="uk" />
}
