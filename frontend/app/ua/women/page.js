import AudienceShopPage from '../../components/AudienceShopPage'
import { AUDIENCE_COPY } from '../../lib/marketplacePreview'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: AUDIENCE_COPY.women.uk.metaTitle,
  description: AUDIENCE_COPY.women.uk.description,
  alternates: localizedAlternates('/women', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianWomenPage(props) {
  return <AudienceShopPage {...props} audience="women" locale="uk" />
}
