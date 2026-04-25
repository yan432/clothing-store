import AccountClient from './AccountClient'

export default async function AccountPage({ searchParams }) {
  const params = await searchParams
  const activeTab = typeof params?.tab === 'string' ? params.tab : 'account'
  const activeSub = typeof params?.sub === 'string' ? params.sub : 'info'
  return <AccountClient activeTab={activeTab} activeSub={activeSub} />
}
