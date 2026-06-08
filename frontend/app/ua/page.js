import Home from '../page'
import { localizedAlternates } from '../lib/seo'
import { staticPageDescription } from '../lib/seoText'

export const metadata = {
  title: 'edm.clothes — Український бренд одягу',
  description: staticPageDescription('home', 'uk'),
  alternates: localizedAlternates('/', 'uk'),
  openGraph: {
    description: staticPageDescription('home', 'uk'),
    locale: 'uk_UA',
  },
}

export default function UkrainianHomePage(props) {
  return <Home {...props} locale="uk" />
}
