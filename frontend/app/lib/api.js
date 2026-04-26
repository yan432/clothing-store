const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : 'https://clothing-store-2e9s.onrender.com'

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

export { API_BASE_URL }
