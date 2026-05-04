import UnsubscribeClient from './UnsubscribeClient'

export const metadata = {
  title: 'Unsubscribe — EDM Clothes',
  robots: { index: false },
}

export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams
  const email = typeof params?.email === 'string' ? params.email : ''
  return <UnsubscribeClient email={email} />
}
