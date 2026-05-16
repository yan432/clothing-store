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
  // Scripts: self + Next.js inline chunks + Stripe + Google Analytics + Meta Pixel
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
  // Styles: self + inline (Next.js injects inline styles)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + Supabase storage + bigcartel CDN + GA beacon + Meta Pixel beacon
  `img-src 'self' data: blob: https://${supabaseHost} https://assets.bigcartel.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com`,
  // Fonts: self
  "font-src 'self' data:",
  // Frames: Stripe payment iframe
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  // Connect: self + backend API + Supabase + Stripe + Google Analytics + Meta Pixel + ipapi
  `connect-src 'self' ${BACKEND_URL} ${SUPABASE_URL} https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://ipapi.co`,
  // Object: none
  "object-src 'none'",
  // Base URI: self only (prevents base tag injection)
  "base-uri 'self'",
  // Form action: self only
  "form-action 'self'",
].join('; ')

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // Add 390px so mobile cards (50vw on 390px phone at 2× DPR)
    // get a 390px image instead of jumping straight to 640px.
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
    remotePatterns: imageHosts.map(hostname => ({ protocol: 'https', hostname })),
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'edmclothes.net' }],
        destination: 'https://www.edmclothes.net/:path*',
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
