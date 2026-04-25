import AdminOnly from '../../components/AdminOnly'
import SettingsClient from './SettingsClient'
import AdminTopBar from '../../components/AdminTopBar'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <AdminOnly>
      <AdminTopBar active="settings" />
      <SettingsClient />
    </AdminOnly>
  )
}
