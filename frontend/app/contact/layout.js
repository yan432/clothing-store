import { localizedAlternates } from '../lib/seo'

export const metadata = {
  title: 'Contact — EDM Clothes',
  description: 'Get in touch with EDM Clothes. We typically respond within 24 hours.',
  alternates: localizedAlternates('/contact'),
}

export default function ContactLayout({ children }) {
  return children
}
