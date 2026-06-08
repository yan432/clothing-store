import { localizedAlternates } from '../lib/seo'
import { staticPageDescription } from '../lib/seoText'

export const metadata = {
  title: 'Contact — EDM Clothes',
  description: staticPageDescription('contact'),
  alternates: localizedAlternates('/contact'),
}

export default function ContactLayout({ children }) {
  return children
}
