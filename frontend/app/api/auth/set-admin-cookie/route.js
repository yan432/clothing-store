import { NextResponse } from 'next/server'

const COOKIE_NAME = 'adm_tok'
const MAX_AGE    = 3600 // 1 hour, matches Supabase access token TTL

/**
 * POST { token: "<supabase-access-token>" }  → sets adm_tok as HttpOnly cookie
 * POST { token: "" | null }                  → clears adm_tok
 *
 * Storing the token via Set-Cookie (server-side) makes it HttpOnly so it is
 * inaccessible to JavaScript, preventing theft via XSS or third-party scripts.
 */
export async function POST(request) {
  const { token } = await request.json().catch(() => ({}))
  const isHttps   = request.headers.get('x-forwarded-proto') === 'https'
    || process.env.NODE_ENV === 'production'

  const secure   = isHttps ? '; Secure' : ''
  const response = NextResponse.json({ ok: true })

  if (token) {
    response.headers.set(
      'Set-Cookie',
      `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; HttpOnly${secure}`
    )
  } else {
    // Clear the cookie
    response.headers.set(
      'Set-Cookie',
      `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure}`
    )
  }

  return response
}
