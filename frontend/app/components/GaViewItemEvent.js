'use client'

import { useEffect } from 'react'
import { isMarketingTrackingDisabled } from '../lib/trackingFilter'

const GA_MEASUREMENT_ID = 'G-CMVZYXVZ8Y'

function ensureGtag() {
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }
}

function syncSavedConsent() {
  if (isMarketingTrackingDisabled()) return false
  try {
    if (window.localStorage.getItem('cookie_consent') !== 'granted') return false
  } catch {
    return false
  }

  ensureGtag()
  window.gtag('consent', 'update', {
    ad_storage:           'granted',
    analytics_storage:    'granted',
    ad_user_data:         'granted',
    ad_personalization:   'granted',
  })
  return true
}

export default function GaViewItemEvent({ item }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !item) return

    let tracked = false

    function trackViewItem() {
      if (isMarketingTrackingDisabled()) return
      if (tracked || !syncSavedConsent()) return
      if (!window.__gaConfigured) return
      tracked = true

      window.gtag('event', 'view_item', {
        send_to:  GA_MEASUREMENT_ID,
        currency: 'EUR',
        value:    Number(item.price) || 0,
        items:    [{
          item_id:       item.item_id,
          item_name:     item.item_name,
          item_category: item.item_category,
          price:         Number(item.price) || 0,
          quantity:      1,
        }],
      })
    }

    function handleConsentChange(event) {
      if (event.detail?.granted) trackViewItem()
    }

    function handleGaConfigured() {
      trackViewItem()
    }

    trackViewItem()
    window.addEventListener('tracking-consent-change', handleConsentChange)
    window.addEventListener('ga-configured', handleGaConfigured)
    const retryTimer = window.setTimeout(trackViewItem, 2500)

    return () => {
      window.removeEventListener('tracking-consent-change', handleConsentChange)
      window.removeEventListener('ga-configured', handleGaConfigured)
      window.clearTimeout(retryTimer)
    }
  }, [item])

  return null
}
