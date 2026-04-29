/** @type {import('next').NextConfig} */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://clothing-store-2e9s.onrender.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlaagtvplzitmqwqbluq.supabase.co'

// Derive the hostname for Supabase storage images
const supabaseHost = (() => {
  try { return new URL(SUPABASE_URL).hostname } catch { return '' }
})()

const cspHeader = [
  "default-src 'self'",
  // Scripts: self + Next.js inline chunks + Stripe
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  // Styles: self + inline (Next.js injects inline styles)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + Supabase storage + bigcartel CDN
  `img-src 'self' data: blob: https://${supabaseHost} https://assets.bigcartel.com`,
  // Fonts: self
  "font-src 'self' data:",
  // Frames: Stripe payment iframe
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  // Connect: self + backend API + Supabase + Stripe
  `connect-src 'self' ${BACKEND_URL} ${SUPABASE_URL} https://api.stripe.com https://checkout.stripe.com`,
  // Object: none
  "object-src 'none'",
  // Base URI: self only (prevents base tag injection)
  "base-uri 'self'",
  // Form action: self only
  "form-action 'self'",
].join('; ')

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'tlaagtvplzitmqwqbluq.supabase.co' },
      { protocol: 'https', hostname: 'assets.bigcartel.com' },
    ],
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
