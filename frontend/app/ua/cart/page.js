import CartPage from '../../cart/page'

export const metadata = {
  title: 'Кошик',
  alternates: { canonical: '/ua/cart' },
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianCartPage() {
  return <CartPage locale="uk" />
}
