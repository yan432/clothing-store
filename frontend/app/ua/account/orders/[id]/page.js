import AccountOrderDetailsClient from '../../../../account/orders/[id]/AccountOrderDetailsClient'

export default async function UkrainianAccountOrderPage({ params }) {
  const routeParams = await params
  const id = routeParams?.id
  return <AccountOrderDetailsClient orderId={id} locale="uk" />
}
