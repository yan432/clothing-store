/**
 * Generic per-user proxy: /api/user/<backend-path> → <BACKEND>/<backend-path>
 *
 * Validates the Supabase session and injects:
 *   - X-User-Token header (HMAC of session email, keyed by ADMIN_SECRET)
 *   - the session email into query string (?email=...) and JSON body ({"email": ...})
 *
 * Any client-supplied email is REPLACED with the authenticated user's email,
 * preventing access to other users' wishlists/orders/etc.
 *
 * Backend endpoints behind this proxy must call verify_user_token(email, request).
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://clothing-store-api-935987805883.europe-west3.run.app'
).replace(/\/$/, '')

const ADMIN_SECRET = process.env.BACKEND_ADMIN_SECRET || ''

function makeUserToken(email) {
  return createHmac('sha256', ADMIN_SECRET)
    .update(`user-profile:${email.toLowerCase().trim()}`)
    .digest('hex')
}

async function getSessionEmail() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email?.toLowerCase().trim() || null
}

async function proxy(request, context) {
  const email = await getSessionEmail()
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { path } = await context.params
  const backendPath = '/' + path.join('/')

  // Build outgoing query string with the session email forced
  const incoming = new URL(request.url)
  const params = new URLSearchParams(incoming.search)
  params.set('email', email)
  const target = `${BACKEND}${backendPath}?${params.toString()}`

  const token = makeUserToken(email)
  const init = {
    method: request.method,
    headers: { 'X-User-Token': token },
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const ct = request.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      let body = {}
      try { body = await request.json() } catch {}
      // Force the email field to match the session — clients cannot impersonate
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify({ ...body, email })
    } else {
      init.headers['Content-Type'] = ct || 'application/octet-stream'
      init.body = await request.arrayBuffer()
    }
  }

  try {
    const upstream = await fetch(target, init)
    const buf = await upstream.arrayBuffer()
    return new NextResponse(buf, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}

export const GET    = proxy
export const POST   = proxy
export const PUT    = proxy
export const PATCH  = proxy
export const DELETE = proxy
