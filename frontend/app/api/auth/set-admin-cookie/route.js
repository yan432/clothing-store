import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const COOKIE_NAME = 'adm_tok'
const MAX_AGE     = 3600 // 1 hour, matches Supabase access token TTL

const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ||
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
  ''
).split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

// Allowed Origins for setting/clearing the admin cookie
const ALLOWED_ORIGINS = [
  'https://www.edmclothes.net',
  'https://edmclothes.net',
  'http://localhost:3000',
]

// JWT shape: 3 base64url segments separated by dots
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // Allow Vercel preview deployments of this project only
  return /^https:\/\/clothing-store(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
}

/**
 * POST { token: "<supabase-access-token>" }  → sets adm_tok as HttpOnly cookie
 * POST { token: "" | null }                  → clears adm_tok
 *
 * Hardening:
 *  - Origin must match the site (CSRF protection)
 *  - Token must be a structurally-valid JWT
 *  - Token must resolve via Supabase to an admin-allowlisted email,
 *    otherwise the cookie is NOT set (non-admin sessions never get adm_tok)
 */
export async function POST(request) {
  const origin = request.headers.get('origin') || ''
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { token } = await request.json().catch(() => ({}))
  const isHttps = request.headers.get('x-forwarded-proto') === 'https'
    || process.env.NODE_ENV === 'production'
  const secure = isHttps ? '; Secure' : ''

  // Clear path: explicit null/empty
  if (!token) {
    const res = NextResponse.json({ ok: true, cleared: true })
    res.headers.set(
      'Set-Cookie',
      `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure}`
    )
    return res
  }

  // Set path: validate token shape AND admin-allowlisted email
  if (typeof token !== 'string' || !JWT_RE.test(token)) {
    return NextResponse.json({ error: 'Invalid token shape' }, { status: 400 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      // Silently succeed without setting the cookie — non-admin users still get
      // a 200 so the AuthContext doesn't error out for normal customers.
      return NextResponse.json({ ok: true, admin: false })
    }
  } catch {
    return NextResponse.json({ error: 'Token verification failed' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true, admin: true })
  res.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; HttpOnly${secure}`
  )
  return res
}
