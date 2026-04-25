import OrderDetailsClient from './OrderDetailsClient'

export const metadata = {
  title: 'Order Details',
  description: 'Detailed order view for operations.',
}

export default async function OrderDetailsPage({ params }) {
  const { id } = await params
  return <OrderDetailsClient id={id} />
}
