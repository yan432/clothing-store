import ExclusivePage, { generateMetadata as generateExclusiveMetadata } from '../../../exclusive/[slug]/page'

export async function generateMetadata(args) {
  return generateExclusiveMetadata({ ...args, locale: 'uk' })
}

export default function UkrainianExclusivePage(props) {
  return <ExclusivePage {...props} locale="uk" />
}
