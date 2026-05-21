/** @type {import('next').NextConfig} */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://clothing-store-api-935987805883.europe-west3.run.app'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlaagtvplzitmqwqbluq.supabase.co'

// Derive the hostname for Supabase storage images
const supabaseHost = (() => {
  try { return new URL(SUPABASE_URL).hostname } catch { return '' }
})()
const imageHosts = Array.from(new Set([
  supabaseHost,
  'tlaagtvplzitmqwqbluq.supabase.co',
  'assets.bigcartel.com',
].filter(Boolean)))

const cspHeader = [
  "default-src 'self'",
  // Scripts: self + Next.js inline chunks + Stripe + Google Analytics + Google Ads + Meta Pixel + TikTok Pixel
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://connect.facebook.net https://analytics.tiktok.com",
  // Styles: self + inline (Next.js injects inline styles)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + Supabase + bigcartel + GA + GTM + Meta + TikTok + Google Ads remarketing pixel
  // Google Ads remarketing pixel comes from country-specific google.<tld>/ads/ga-audiences — list common EU/global TLDs
  `img-src 'self' data: blob: https://${supabaseHost} https://assets.bigcartel.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://analytics.tiktok.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google.com https://www.google.de https://www.google.co.uk https://www.google.fr https://www.google.es https://www.google.it https://www.google.nl https://www.google.at https://www.google.pl https://www.google.ca`,
  // Fonts: self
  "font-src 'self' data:",
  // Frames: Stripe payment iframe
  "frame-src https://js.stripe.com https://hooks.stripe.com https://td.doubleclick.net",
  // Connect: self + backend API + Supabase + Stripe + GA + Google Ads + Meta + TikTok + ipapi
  `connect-src 'self' ${BACKEND_URL} ${SUPABASE_URL} https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://stats.g.doubleclick.net https://googleads.g.doubleclick.net https://td.doubleclick.net https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com https://www.google.de https://www.google.co.uk https://www.google.fr https://www.google.es https://www.google.it https://www.google.nl https://www.google.at https://www.google.pl https://www.google.ca https://www.facebook.com https://connect.facebook.net https://analytics.tiktok.com https://ads.tiktok.com https://ipapi.co`,
  // Object: none
  "object-src 'none'",
  // Base URI: self only (prevents base tag injection)
  "base-uri 'self'",
  // Form action: self only
  "form-action 'self'",
].join('; ')

const nextConfig = {
  images: {
    formats: ['image/webp'],
    // Add 390px so mobile cards (50vw on 390px phone at 2× DPR)
    // get a 390px image instead of jumping straight to 640px.
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: imageHosts.map(hostname => ({ protocol: 'https', hostname })),
  },

  async redirects() {
    return [
      // Canonical host: edmclothes.net → www.edmclothes.net
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'edmclothes.net' }],
        destination: 'https://www.edmclothes.net/:path*',
        permanent: true,
      },
      // Legacy BigCartel URLs — preserve SEO equity and stop 404s
      {
        source: '/product/:slug',
        destination: '/products/:slug',
        permanent: true,
      },
      // Capitalised category names (product.category in DB is "Tops" not "tops")
      { source: '/category/tops',        destination: '/products?category=Tops',        permanent: true },
      { source: '/category/bottoms',     destination: '/products?category=Bottoms',     permanent: true },
      { source: '/category/outerwear',   destination: '/products?category=Outerwear',   permanent: true },
      { source: '/category/accessories', destination: '/products?category=Accessories', permanent: true },
      { source: '/category/knitwear',    destination: '/products?category=Knitwear',    permanent: true },
      { source: '/category/denim',       destination: '/products?category=Denim',       permanent: true },
      { source: '/category/jackets',     destination: '/products?category=Jackets',     permanent: true },
      // Fallback for any other /category/* — just send to the catalog page
      {
        source: '/category/:name',
        destination: '/products',
        permanent: true,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Stop MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer policy — don't leak full URL in Referer header
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — disable unused browser APIs
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
