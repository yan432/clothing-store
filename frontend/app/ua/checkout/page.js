import CheckoutPage from '../../checkout/page'

export const metadata = {
  title: 'Оформлення замовлення',
  alternates: { canonical: '/ua/checkout' },
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianCheckoutPage() {
  return <CheckoutPage locale="uk" />
}
