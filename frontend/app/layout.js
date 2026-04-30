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
import { GoogleAnalytics } from '@next/third-parties/google'
import Script from 'next/script'
import CookieConsent from './components/CookieConsent'
import UtmCapture from './components/UtmCapture'
import { WishlistProvider } from './context/WishlistContext'
import WishlistDrawer from './components/WishlistDrawer'
import { Suspense } from 'react'

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
    title: { default: homeTitle, template: `%s — ${siteName}` },
    description,
    icons: { icon: '/icon.png', apple: '/icon.png' },
    openGraph: {
      siteName,
      description,
      locale: 'en_US',
      type: 'website',
    },
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Consent Mode v2 — must run before GA loads */}
        <Script id="ga-consent-defaults" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage:         'denied',
            analytics_storage:  'denied',
            ad_user_data:       'denied',
            ad_personalization: 'denied',
            wait_for_update:    500
          });
        `}</Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <WishlistProvider>
          <CartProvider>
            <AnnouncementBar />
            <NavBar />
            <DrawerWrapper />
            <WishlistDrawer />
            <EmailCapturePopup />
            <Suspense fallback={null}><UtmCapture /></Suspense>
            {children}
            <Footer />
            <CookieConsent />
            <Analytics />
            <SpeedInsights />
            <GoogleAnalytics gaId="G-CMVZYXVZ8Y" />
          </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
