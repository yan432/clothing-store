import AdminTopBar from '../../components/AdminTopBar'
import PagesClient from './PagesClient'

export default function AdminPagesPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>
      <AdminTopBar active="pages" />
      <PagesClient />
    </main>
  )
}
