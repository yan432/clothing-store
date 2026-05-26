import ResetPasswordPage from '../../../auth/reset/page'

export const metadata = {
  title: 'Скидання пароля — edm.clothes',
  alternates: { canonical: '/ua/auth/reset' },
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianResetPasswordPage() {
  return <ResetPasswordPage locale="uk" />
}
