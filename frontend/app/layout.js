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
import { WishlistProvider } from './context/WishlistContext'
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Speed up Supabase-hosted hero image (LCP) by warming the TCP/TLS connection */}
        <link rel="preconnect" href="https://tlaagtvplzitmqwqbluq.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://tlaagtvplzitmqwqbluq.supabase.co" />
        {/* Backend API — warming the connection saves ~300ms on first product/settings fetch */}
        <link rel="preconnect" href="https://clothing-store-api-935987805883.europe-west3.run.app" crossOrigin="" />
        <link rel="dns-prefetch" href="https://clothing-store-api-935987805883.europe-west3.run.app" />
        {/* Consent Mode v2 — must run before GA loads */}
        <Script id="ga-consent-defaults" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}

          // EEA + UK: require explicit consent (GDPR)
          gtag('consent', 'default', {
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
          gtag('consent', 'default', {
            ad_storage:         'denied',
            analytics_storage:  'granted',
            ad_user_data:       'denied',
            ad_personalization: 'denied'
          });

          // Pass click/session IDs in URLs when cookies are denied (improves accuracy)
          gtag('set', 'url_passthrough', true);
        `}</Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <WishlistProvider>
          <CartProvider>
            <AnnouncementBar />
            <NavBar />
            <DrawerWrapper />
            <EmailCapturePopup />
            <Suspense fallback={null}><UtmCapture /></Suspense>
            {children}
            <Footer />
            <CookieConsent />
            <Analytics />
            <SpeedInsights />
            {/* GA loads after page is fully idle — reduces initial JS weight ~64 KiB */}
            <Script src="https://www.googletagmanager.com/gtag/js?id=G-CMVZYXVZ8Y" strategy="lazyOnload" />
            <Script id="ga-config" strategy="lazyOnload">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-CMVZYXVZ8Y');
              gtag('config', 'AW-16809967064');
              window.__gaConfigured = true;
              window.dispatchEvent(new Event('ga-configured'));
            `}</Script>
            {/* Meta Pixel — lazyOnload to keep ~180ms off TBT */}
            <Script id="meta-pixel" strategy="lazyOnload">{`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1608949326833856');
              var cookieConsent = null;
              try { cookieConsent = localStorage.getItem('cookie_consent'); } catch (e) {}
              if (cookieConsent === 'granted') {
                fbq('consent', 'grant');
                fbq('track', 'PageView');
                window.__metaPageViewTracked = true;
              } else {
                fbq('consent', 'revoke');
              }
            `}</Script>
            {/* TikTok Pixel — lazyOnload to keep ~180ms off TBT */}
            <Script id="tiktok-pixel" strategy="lazyOnload">{`
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                ttq.load('D879J7JC77U3446EEDE0');
                var cookieConsent = null;
                try { cookieConsent = localStorage.getItem('cookie_consent'); } catch (e) {}
                if (cookieConsent === 'granted') {
                  ttq.grantConsent();
                  ttq.page();
                  window.__ttqPageViewTracked = true;
                } else {
                  ttq.holdConsent();
                }
              }(window, document, 'ttq');
            `}</Script>
            {/* Microsoft Clarity — session replays + heatmaps */}
            <Script id="ms-clarity" strategy="lazyOnload">{`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "wvgo1gvy39");
            `}</Script>
          </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
