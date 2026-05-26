import ConfirmPage from '../../confirm/page'

export const metadata = {
  title: 'Підтвердження замовлення',
  alternates: { canonical: '/ua/confirm' },
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianConfirmPage() {
  return <ConfirmPage locale="uk" />
}
