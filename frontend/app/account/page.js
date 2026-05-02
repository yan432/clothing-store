import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export default async function AccountPage({ searchParams }) {
  const params = await searchParams
  const raw = typeof params?.tab === 'string' ? params.tab : 'account'
  if (raw === 'sizes') redirect('/account')
  return <AccountClient activeTab={raw} />
}
