import BrandsClient from './BrandsClient'
import PageHeader from '../_components/PageHeader'

export const metadata = { title: 'Brands' }

export default function AdminBrandsPage() {
  return (
    <>
      <PageHeader title="Brands" subtitle="Marketplace partners. Each product can be assigned to a brand." />
      <BrandsClient />
    </>
  )
}
