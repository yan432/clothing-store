import ShippingPage from '../../shipping/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Доставка',
  alternates: localizedAlternates('/shipping', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianShippingPage() {
  return <ShippingPage locale="uk" />
}
