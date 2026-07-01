import AudienceShopPage from '../components/AudienceShopPage'
import { AUDIENCE_COPY } from '../lib/marketplacePreview'
import { localizedAlternates } from '../lib/seo'

export const metadata = {
  title: AUDIENCE_COPY.men.en.metaTitle,
  description: AUDIENCE_COPY.men.en.description,
  alternates: localizedAlternates('/men'),
}

export default function MenPage(props) {
  return <AudienceShopPage {...props} audience="men" locale="en" />
}
