import AuthPage from '../../auth/page'

export const metadata = {
  title: 'Акаунт',
  alternates: { canonical: '/ua/auth' },
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianAuthPage() {
  return <AuthPage locale="uk" />
}
