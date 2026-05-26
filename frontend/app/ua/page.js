import Home from '../page'
import { localizedAlternates } from '../lib/seo'

export const metadata = {
  title: 'edm.clothes — Український бренд одягу',
  description: 'Мінімалістичний одяг для щоденного носіння. Зроблено в Україні.',
  alternates: localizedAlternates('/', 'uk'),
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianHomePage(props) {
  return <Home {...props} locale="uk" />
}
