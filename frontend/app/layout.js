import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import NavBar from './components/NavBar'
import AnnouncementBar from './components/AnnouncementBar'
import DrawerWrapper from './components/DrawerWrapper'
import Footer from './components/Footer'
import EmailCapturePopup from './components/EmailCapturePopup'
import { getApiUrl } from './lib/api'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import CookieConsent from './components/CookieConsent'
import UtmCapture from './components/UtmCapture'
import MarketingPixels from './components/MarketingPixels'
import { WishlistProvider } from './context/WishlistContext'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { localeFromPathname } from './lib/i18n'
import { shouldSuppressMarketingTracking } from './lib/trackingFilter'

const inter = Inter({ subsets: ['latin'] })

async function getSeoSettings() {
  try {
    const res = await fetch(getApiUrl('/settings'), { next: { revalidate: 300 } })
    if (!res.ok) return {}
    const data = await res.json()
    return data || {}
  } catch {
    return {}
  }
}

export async function generateMetadata() {
  const s = await getSeoSettings()
  const siteName = s.seo_site_name || 'edm.clothes'
  const homeTitle = s.seo_home_title || `${siteName} — Minimal Clothing`
  const description = s.seo_home_description || 'Minimal essentials designed for everyday wear. Made in Ukraine.'

  return {
    metadataBase: new URL('https://www.edmclothes.net'),
    title: { default: homeTitle, template: `%s — ${siteName}` },
    description,
    icons: { icon: '/icon.png', apple: '/icon.png' },
    openGraph: {
      siteName,
      description,
      locale: 'en_US',
      type: 'website',
    },
    other: {
      'facebook-domain-verification': 'nvr0bc6n44ihao3txijoyc3aunbvri',
      'p:domain_verify': '92012999928bcf03c27cd43cee0f701a',
    },
  }
}

export default async function RootLayout({ children }) {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-edm-pathname') || '/'
  const search = requestHeaders.get('x-edm-search') || ''
  const referrer = requestHeaders.get('referer') || ''
  const hostname = requestHeaders.get('host') || ''
  const locale = localeFromPathname(pathname)
  const isOperationsPath = (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/partner' ||
    pathname.startsWith('/partner/')
  )
  const suppressMarketingTracking = isOperationsPath || shouldSuppressMarketingTracking({
    pathname,
    search,
    referrer,
    hostname,
  })

  return (
    <html lang={locale === 'uk' ? 'uk' : 'en'}>
      <head>
        {/* Speed up Supabase-hosted hero image (LCP) by warming the TCP/TLS connection */}
        <link rel="preconnect" href="https://tlaagtvplzitmqwqbluq.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://tlaagtvplzitmqwqbluq.supabase.co" />
        {/* Backend API — warming the connection saves ~300ms on first product/settings fetch */}
        <link rel="preconnect" href="https://clothing-store-api-935987805883.europe-west3.run.app" crossOrigin="" />
        <link rel="dns-prefetch" href="https://clothing-store-api-935987805883.europe-west3.run.app" />
        {/* Consent Mode v2 — must run before GA loads */}
        <Script id="edm-tracking-filter" strategy="beforeInteractive">{`
          window.__edmTrackingDisabled = ${suppressMarketingTracking ? 'true' : 'false'};
        `}</Script>
        <Script id="ga-consent-defaults" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);}

          // EEA + UK: require explicit consent (GDPR)
          window.gtag('consent', 'default', {
            ad_storage:         'denied',
            analytics_storage:  'denied',
            ad_user_data:       'denied',
            ad_personalization: 'denied',
            wait_for_update:    500,
            region: [
              'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
              'FR','GR','HR','HU','IE','IS','IT','LI','LT','LU',
              'LV','MT','NL','NO','PL','PT','RO','SE','SI','SK','GB'
            ]
          });

          // All other regions: grant analytics by default (no consent banner needed)
          window.gtag('consent', 'default', {
            ad_storage:         'denied',
            analytics_storage:  'granted',
            ad_user_data:       'denied',
            ad_personalization: 'denied'
          });

          // Pass click/session IDs in URLs when cookies are denied (improves accuracy)
          window.gtag('set', 'url_passthrough', true);
        `}</Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <WishlistProvider>
          <CartProvider>
            {!isOperationsPath && (
              <>
                <AnnouncementBar />
                <NavBar />
                <DrawerWrapper />
                <EmailCapturePopup />
                <Suspense fallback={null}><UtmCapture /></Suspense>
              </>
            )}
            {children}
            {!isOperationsPath && (
              <>
                <Footer />
                <CookieConsent />
              </>
            )}
            <MarketingPixels disabled={suppressMarketingTracking} />
            {!suppressMarketingTracking && (
              <>
                <Analytics />
                <SpeedInsights />
              </>
            )}
          </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
