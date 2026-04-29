/**
 * Generic proxy: /api/backend/foo/bar → BACKEND_URL/foo/bar
 *
 * Security: for every request we attach X-Admin-Secret so the backend can
 * enforce auth. We verify the caller is an authenticated admin by checking
 * their Supabase session cookie server-side before forwarding the request.
 * Public-facing endpoints (checkout, contact, etc.) bypass the admin check
 * because they are never called through this proxy by regular users.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://clothing-store-2e9s.onrender.com'
).replace(/\/$/, '')

// Secret shared with the backend — set BACKEND_ADMIN_SECRET in Next.js env
// and ADMIN_SECRET (same value) in the backend .env
const BACKEND_ADMIN_SECRET = process.env.BACKEND_ADMIN_SECRET || ''

// Admin emails — server-side only (same value as NEXT_PUBLIC_ADMIN_EMAILS but
// read from a non-public var so it can't be inspected in browser bundle)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase())
}

async function proxy(request, context) {
  const { path } = await context.params
  const url = new URL(request.url)
  const target = `${BACKEND}/${path.join('/')}${url.search}`

  // Verify admin session via Supabase cookie
  let adminVerified = false
  if (BACKEND_ADMIN_SECRET) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      adminVerified = isAdminEmail(user?.email)
    } catch (_) {
      adminVerified = false
    }

    if (!adminVerified) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  const init = { method: request.method, headers: {} }

  // Forward the admin secret so the backend can enforce its own auth check
  if (BACKEND_ADMIN_SECRET && adminVerified) {
    init.headers['X-Admin-Secret'] = BACKEND_ADMIN_SECRET
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const ct = request.headers.get('content-type') || ''
    init.headers['content-type'] = ct
    init.body = await request.arrayBuffer()
  }

  try {
    const upstream = await fetch(target, init)
    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}

export const GET    = proxy
export const POST   = proxy
export const PATCH  = proxy
export const DELETE = proxy
export const PUT    = proxy
