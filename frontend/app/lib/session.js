/**
 * Persistent anonymous session ID stored in a cookie.
 * Survives page reloads and links anonymous events to a user
 * after they sign in.
 */

const COOKIE_NAME = 'edm_sid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value, maxAge) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`
}

export function getSessionId() {
  if (typeof window === 'undefined') return 'ssr'
  let sid = getCookie(COOKIE_NAME)
  if (!sid) {
    sid = generateId()
    setCookie(COOKIE_NAME, sid, COOKIE_MAX_AGE)
  }
  return sid
}
