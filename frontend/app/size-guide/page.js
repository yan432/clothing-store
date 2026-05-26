import SizeGuideClient from './SizeGuideClient'
import { localizedAlternates } from '../lib/seo'

export const metadata = {
  title: 'Size Guide — EDM Clothes',
  description: 'Find your perfect size with our size chart and interactive size calculator.',
  alternates: localizedAlternates('/size-guide'),
}

export default function SizeGuidePage({ locale = 'en' }) {
  return <SizeGuideClient locale={locale} />
}
