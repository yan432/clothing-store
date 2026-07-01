import AudienceShopPage from '../components/AudienceShopPage'
import { AUDIENCE_COPY } from '../lib/marketplacePreview'
import { localizedAlternates } from '../lib/seo'

export const metadata = {
  title: AUDIENCE_COPY.women.en.metaTitle,
  description: AUDIENCE_COPY.women.en.description,
  alternates: localizedAlternates('/women'),
}

export default function WomenPage(props) {
  return <AudienceShopPage {...props} audience="women" locale="en" />
}
