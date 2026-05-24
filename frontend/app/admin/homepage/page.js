import AdminOnly from '../../components/AdminOnly'
import AdminTopBar from '../../components/AdminTopBar'
import HomepageSlidesClient from './HomepageSlidesClient'
import InstagramPostsClient from './InstagramPostsClient'

export const metadata = { title: 'Homepage Slides' }

export default function HomepageSlidesPage() {
  return (
    <AdminOnly>
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 72px' }}>
        <AdminTopBar active="homepage" />
        <HomepageSlidesClient />
        <InstagramPostsClient />
      </main>
    </AdminOnly>
  )
}
