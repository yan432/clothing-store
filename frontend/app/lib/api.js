const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'https://clothing-store-api-935987805883.europe-west3.run.app'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL

export function getApiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

/**
 * For admin browser-side fetches: routes through Next.js /api/backend proxy
 * so there are zero cross-origin (CORS) issues regardless of where the
 * frontend is hosted.
 * In development still hits the backend directly (no proxy needed).
 */
export function getAdminApiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:8000${normalizedPath}`
  }
  return `/api/backend${normalizedPath}`
}

/**
 * For partner cabinet browser-side fetches: routes through the /api/partner
 * proxy which forwards the caller's identity headers. Backend resolves the
 * brand from brand_users.
 */
export function getPartnerApiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (process.env.NODE_ENV === 'development') {
    return `/api/partner${normalizedPath}`
  }
  return `/api/partner${normalizedPath}`
}

export { API_BASE_URL }
