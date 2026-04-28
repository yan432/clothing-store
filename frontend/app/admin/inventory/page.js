import AdminTopBar from '../../components/AdminTopBar'
import InventoryClient from './InventoryClient'

export default function AdminInventoryPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
      <AdminTopBar active="inventory" />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Inventory by size</h1>
      </div>
      <InventoryClient />
    </main>
  )
}
