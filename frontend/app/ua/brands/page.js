import BrandsPage from '../../brands/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Бренди — edm.clothes',
  description: 'Відкрий незалежні streetwear бренди на edm.clothes.',
  alternates: localizedAlternates('/brands', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianBrandsPage(props) {
  return <BrandsPage {...props} locale="uk" />
}
