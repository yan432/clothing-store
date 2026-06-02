const INTERNAL_PATH_PREFIXES = ['/admin', '/upload']

const INTERNAL_QUERY_KEYS = [
  '_dbg',
  'debug',
  'gtm_auth',
  'gtm_cookies_win',
  'gtm_debug',
  'gtm_latency',
  'gtm_preview',
  'tagassistant',
  'tt_test_id',
]

const INTERNAL_REFERRER_HOSTS = [
  'adsmanager.facebook.com',
  'business.facebook.com',
  'eventsmanager.facebook.com',
  'merchants.google.com',
  'tagassistant.google.com',
  'vercel.com',
]

function cleanHostname(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
}

function referrerHostname(referrer = '') {
  try {
    return cleanHostname(new URL(referrer).hostname)
  } catch {
    return cleanHostname(referrer)
  }
}

function searchParamsFrom(search = '') {
  try {
    return new URLSearchParams(String(search || '').replace(/^\?/, ''))
  } catch {
    return new URLSearchParams()
  }
}

function isPreviewOrLocalHost(hostname = '') {
  const host = cleanHostname(hostname)
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.vercel.app')
  )
}

export function shouldSuppressMarketingTracking({
  pathname = '',
  search = '',
  referrer = '',
  hostname = '',
} = {}) {
  const params = searchParamsFrom(search)
  const override = String(params.get('edm_tracking') || '').trim().toLowerCase()
  if (['1', 'true', 'force', 'on'].includes(override)) return false
  if (['0', 'false', 'off', 'debug'].includes(override)) return true

  const cleanPath = String(pathname || '').toLowerCase()
  if (INTERNAL_PATH_PREFIXES.some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`))) {
    return true
  }

  if (INTERNAL_QUERY_KEYS.some((key) => params.has(key))) return true
  if (isPreviewOrLocalHost(hostname)) return true

  const refHost = referrerHostname(referrer)
  return INTERNAL_REFERRER_HOSTS.some((host) => refHost === host || refHost.endsWith(`.${host}`))
}

export function isMarketingTrackingDisabled() {
  if (typeof window === 'undefined') return false
  if (window.__edmTrackingDisabled === true) return true

  const disabled = shouldSuppressMarketingTracking({
    pathname: window.location?.pathname,
    search: window.location?.search,
    referrer: document?.referrer,
    hostname: window.location?.hostname,
  })

  if (disabled) window.__edmTrackingDisabled = true
  return disabled
}
