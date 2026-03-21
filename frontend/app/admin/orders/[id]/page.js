import OrderDetailsClient from './OrderDetailsClient'

export const metadata = {
  title: 'Order Details',
  description: 'Detailed order view for operations.',
}

export default function OrderDetailsPage({ params }) {
  return <OrderDetailsClient id={params.id} />
}
