import CollectionPage, { generateMetadata as generateCollectionMetadata, generateStaticParams } from '../../../collections/[slug]/page'

export { generateStaticParams }

export async function generateMetadata(args) {
  return generateCollectionMetadata({ ...args, locale: 'uk' })
}

export default function UkrainianCollectionPage(props) {
  return <CollectionPage {...props} locale="uk" />
}
