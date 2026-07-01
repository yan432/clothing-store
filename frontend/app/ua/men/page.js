import AudienceShopPage from '../../components/AudienceShopPage'
import { AUDIENCE_COPY } from '../../lib/marketplacePreview'
import { localizedAlternates } from '../../lib/seo'

export const metadata = {
  title: AUDIENCE_COPY.men.uk.metaTitle,
  description: AUDIENCE_COPY.men.uk.description,
  alternates: localizedAlternates('/men', 'uk'),
  openGraph: { locale: 'uk_UA' },
}

export default function UkrainianMenPage(props) {
  return <AudienceShopPage {...props} audience="men" locale="uk" />
}
