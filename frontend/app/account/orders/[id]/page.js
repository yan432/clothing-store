import AccountOrderDetailsClient from './AccountOrderDetailsClient'

export default async function AccountOrderPage({ params }) {
  const routeParams = await params
  const id = routeParams?.id
  return <AccountOrderDetailsClient orderId={id} />
}
