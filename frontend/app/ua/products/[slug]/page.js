import ProductPage, { generateMetadata as generateProductMetadata } from '../../../products/[slug]/page'

export async function generateMetadata(args) {
  return generateProductMetadata({ ...args, locale: 'uk' })
}

export default function UkrainianProductPage(props) {
  return <ProductPage {...props} locale="uk" />
}
