'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

const STORAGE_KEY = 'cookie_consent'

function consentGranted() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'granted'
  } catch {
    return false
  }
}

export default function MarketingPixels({ disabled = false }) {
  const [marketingEnabled, setMarketingEnabled] = useState(false)

  useEffect(() => {
    if (disabled || window.__edmTrackingDisabled) {
      return undefined
    }

    let cancelScheduledStart = null
    let initialSync = null
    const sync = (event) => {
      const granted = event?.detail?.granted ?? consentGranted()
      if (!granted) {
        setMarketingEnabled(false)
        return
      }
      const start = () => setMarketingEnabled(true)
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(start, { timeout: 1800 })
        cancelScheduledStart = () => window.cancelIdleCallback(id)
      } else {
        const id = window.setTimeout(start, 900)
        cancelScheduledStart = () => window.clearTimeout(id)
      }
    }

    initialSync = window.setTimeout(sync, 0)
    window.addEventListener('tracking-consent-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      if (initialSync) window.clearTimeout(initialSync)
      if (cancelScheduledStart) cancelScheduledStart()
      window.removeEventListener('tracking-consent-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [disabled])

  if (disabled) return null

  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-CMVZYXVZ8Y" strategy="afterInteractive" />
      <Script id="ga-config" strategy="afterInteractive">{`
        if (!window.__edmTrackingDisabled && !window.__gaConfigured) {
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);}
          window.gtag('js', new Date());
          window.gtag('config', 'G-CMVZYXVZ8Y');
          window.gtag('config', 'AW-16809967064');
          window.__gaConfigured = true;
          window.dispatchEvent(new Event('ga-configured'));
        }
      `}</Script>
      {marketingEnabled && (
        <>
      <Script id="meta-pixel" strategy="lazyOnload">{`
        if (!window.__edmTrackingDisabled && !window.fbq) {
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1608949326833856');
          fbq('consent', 'grant');
          if (!window.__metaPageViewTracked) {
            fbq('track', 'PageView');
            window.__metaPageViewTracked = true;
          }
        }
      `}</Script>
      <Script id="tiktok-pixel" strategy="lazyOnload">{`
        if (!window.__edmTrackingDisabled && !window.ttq) {
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
            ttq.load('D879J7JC77U3446EEDE0');
            ttq.grantConsent();
            if (!window.__ttqPageViewTracked) {
              ttq.page();
              window.__ttqPageViewTracked = true;
            }
          }(window, document, 'ttq');
        }
      `}</Script>
      <Script id="ms-clarity" strategy="lazyOnload">{`
        if (!window.__edmTrackingDisabled && !window.clarity) {
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "wvgo1gvy39");
        }
      `}</Script>
        </>
      )}
    </>
  )
}
