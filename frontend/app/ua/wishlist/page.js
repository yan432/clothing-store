import WishlistPage from '../../wishlist/page'

export const metadata = {
  title: 'Обране',
  alternates: { canonical: '/ua/wishlist' },
  openGraph: {
    locale: 'uk_UA',
  },
}

export default function UkrainianWishlistPage() {
  return <WishlistPage locale="uk" />
}
