import AccountClient from './AccountClient'

export default async function AccountPage({ searchParams }) {
  const params = await searchParams
  const activeTab = typeof params?.tab === 'string' ? params.tab : 'overview'
  return <AccountClient activeTab={activeTab} />
}
