/**
 * Generic proxy: /api/backend/foo/bar → BACKEND_URL/foo/bar
 *
 * Auth: the browser stores the Supabase access token in an `adm_tok` cookie
 * (set by AuthContext on every session change). The proxy verifies it by
 * calling supabase.auth.getUser(token), then checks the email against the
 * ADMIN_EMAILS list before forwarding the request with X-Admin-Secret.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://clothing-store-2e9s.onrender.com'
).replace(/\/$/, '')

const BACKEND_ADMIN_SECRET = process.env.BACKEND_ADMIN_SECRET || ''

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase())
}

async function proxy(request, context) {
  const { path } = await context.params
  const url = new URL(request.url)
  const target = `${BACKEND}/${path.join('/')}${url.search}`

  let adminVerified = false

  if (BACKEND_ADMIN_SECRET) {
    try {
      const cookieStore = await cookies()
      const admTok = cookieStore.get('adm_tok')?.value

      if (admTok) {
        // Verify the Supabase JWT directly — no cookie reassembly needed
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )
        const { data: { user } } = await supabase.auth.getUser(admTok)
        adminVerified = isAdminEmail(user?.email)
      }
    } catch (_) {
      adminVerified = false
    }

    if (!adminVerified) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  const init = { method: request.method, headers: {} }

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
