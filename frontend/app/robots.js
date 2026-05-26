export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // NOTE: /product/ and /category/ are intentionally NOT disallowed —
        // Google needs to crawl the old BigCartel URLs to see the 301s and
        // transfer SEO equity to the new ones. They'll fall out of the index
        // naturally once the redirects are followed.
        disallow: [
          '/admin',
          '/account',
          '/cart',
          '/checkout',
          '/confirm',
          '/success',
          '/wishlist',
          '/api/',
          '/maintenance',
          '/auth',
          '/ua/account',
          '/ua/cart',
          '/ua/checkout',
          '/ua/confirm',
          '/ua/success',
          '/ua/wishlist',
          '/ua/auth',
        ],
      },
    ],
    sitemap: 'https://www.edmclothes.net/sitemap.xml',
    host: 'https://www.edmclothes.net',
  }
}
