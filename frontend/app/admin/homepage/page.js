import HomepageSlidesClient from './HomepageSlidesClient'
import InstagramPostsClient from './InstagramPostsClient'
import PageHeader from '../_components/PageHeader'

export const metadata = { title: 'Homepage' }

export default function HomepageSlidesPage() {
  return (
    <>
      <PageHeader title="Homepage" subtitle="Slides and Instagram blocks shown on the storefront." />
      <HomepageSlidesClient />
      <InstagramPostsClient />
    </>
  )
}
