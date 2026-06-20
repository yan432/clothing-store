import InventoryClient from './InventoryClient'
import PageHeader from '../_components/PageHeader'

export const metadata = { title: 'Inventory' }

export default function AdminInventoryPage() {
  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock levels per size." />
      <InventoryClient />
    </>
  )
}
