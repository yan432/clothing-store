import ProductsPage, { generateMetadata as generateProductsMetadata } from '../../products/page'

export async function generateMetadata(args) {
  return generateProductsMetadata({ ...args, locale: 'uk' })
}

export default function UkrainianProductsPage(props) {
  return <ProductsPage {...props} locale="uk" />
}
