/**
 * Generic proxy: /api/backend/foo/bar → BACKEND_URL/foo/bar
 *
 * Auth (two methods, tried in order):
 * 1. adm_tok cookie — Supabase access token stored by AuthContext on session change.
 *    Verified via supabase.auth.getUser(token). Fast and reliable after first page load.
 * 2. SSR session — @supabase/ssr reads the chunked Supabase session cookies directly.
 *    Fallback for the first admin request before AuthContext has set adm_tok.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
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
    const cookieStore = await cookies()

    // ── Method 1: adm_tok cookie (set by AuthContext after getSession resolves) ──
    try {
      const admTok = cookieStore.get('adm_tok')?.value
      if (admTok) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )
        const { data: { user } } = await supabase.auth.getUser(admTok)
        if (isAdminEmail(user?.email)) adminVerified = true
      }
    } catch (_) {}

    // ── Method 2: SSR session cookies (@supabase/ssr chunked format) ──
    if (!adminVerified) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (isAdminEmail(user?.email)) adminVerified = true
      } catch (_) {}
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
