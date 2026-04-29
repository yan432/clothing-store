export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/checkout', '/confirm', '/api/'],
      },
    ],
    sitemap: 'https://edmclothes.net/sitemap.xml',
  }
}
