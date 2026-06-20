import SettingsClient from './SettingsClient'
import PageHeader from '../_components/PageHeader'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="SEO, emails, announcement bar and other site-wide configuration." />
      <SettingsClient />
    </>
  )
}
