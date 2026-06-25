import AdminOnly from '../components/AdminOnly'
import Sidebar from './_components/Sidebar'
import { tokens } from './_components/tokens'

export const metadata = {
  title: 'Admin',
  description: 'Store administration.',
}

export default function AdminLayout({ children }) {
  return (
    <AdminOnly>
      <div className="operations-shell admin-shell" style={{ display: 'flex', alignItems: 'stretch', background: tokens.color.bg, minHeight: '100vh' }}>
        <Sidebar />
        <main className="operations-main" style={{ flex: 1, minWidth: 0, padding: '32px 32px 64px' }}>
          {children}
        </main>
      </div>
    </AdminOnly>
  )
}
