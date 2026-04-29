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
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <AnnouncementBar />
            <NavBar />
            <DrawerWrapper />
            <EmailCapturePopup />
            {children}
            <Footer />
            <Analytics />
            <SpeedInsights />
            <GoogleAnalytics gaId="G-WVXM8RGKBL" />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
