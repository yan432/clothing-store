import ProductsPage from '../../products/page'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: 'Магазин',
  description: 'Переглянь повну колекцію edm.clothes.',
  alternates: localizedAlternates('/products', 'uk'),
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianProductsPage(props) {
  return <ProductsPage {...props} locale="uk" />
}
