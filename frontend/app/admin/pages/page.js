import PagesClient from './PagesClient'
import PageHeader from '../_components/PageHeader'

export const metadata = { title: 'Static pages' }

export default function AdminPagesPage() {
  return (
    <>
      <PageHeader title="Static pages" subtitle="About, returns, shipping policy and other CMS pages." />
      <PagesClient />
    </>
  )
}
