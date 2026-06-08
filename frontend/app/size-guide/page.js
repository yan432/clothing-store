import SizeGuideClient from './SizeGuideClient'
import { localizedAlternates } from '../lib/seo'
import { staticPageDescription } from '../lib/seoText'

export const metadata = {
  title: 'Size Guide — EDM Clothes',
  description: staticPageDescription('sizeGuide'),
  alternates: localizedAlternates('/size-guide'),
}

export default function SizeGuidePage({ locale = 'en' }) {
  return <SizeGuideClient locale={locale} />
}
