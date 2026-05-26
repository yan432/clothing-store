export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import AccountClient from '../../account/AccountClient'

export const metadata = {
  title: 'Мій акаунт',
  alternates: { canonical: '/ua/account' },
  openGraph: {
    locale: 'uk_UA',
  },
}

export default async function UkrainianAccountPage({ searchParams }) {
  const params = await searchParams
  const raw = typeof params?.tab === 'string' ? params.tab : 'account'
  if (raw === 'sizes') redirect('/ua/account')
  return <AccountClient activeTab={raw} locale="uk" />
}
