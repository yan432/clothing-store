/**
 * Partner proxy: /api/partner/foo/bar → BACKEND_URL/foo/bar
 *
 * Mirrors /api/backend but admits any authenticated Supabase user (not only
 * admins). The backend resolves the caller's brand from X-Partner-User-Id /
 * X-Partner-User-Email after verifying X-Admin-Secret proves the request came
 * through this proxy.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://clothing-store-api-935987805883.europe-west3.run.app'
).replace(/\/$/, '')

const BACKEND_ADMIN_SECRET = process.env.BACKEND_ADMIN_SECRET || ''

async function proxy(request, context) {
  const { path } = await context.params
  const url = new URL(request.url)
  const target = `${BACKEND}/${path.join('/')}${url.search}`

  if (!BACKEND_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Partner cabinet not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  let user = null

  // Method 1: adm_tok cookie (set by AuthContext on session change).
  try {
    const admTok = cookieStore.get('adm_tok')?.value
    if (admTok) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const result = await supabase.auth.getUser(admTok)
      user = result?.data?.user || null
    }
  } catch (_) {}

  // Method 2: SSR session cookies.
  if (!user) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      )
      const result = await supabase.auth.getUser()
      user = result?.data?.user || null
    } catch (_) {}
  }

  if (!user?.id || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const init = {
    method: request.method,
    headers: {
      'X-Admin-Secret': BACKEND_ADMIN_SECRET,
      'X-Partner-User-Id': user.id,
      'X-Partner-User-Email': user.email,
    },
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.headers['content-type'] = request.headers.get('content-type') || 'application/json'
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
    const requestId = randomUUID()
    console.error(`Partner proxy failed [${requestId}]`, e)
    return NextResponse.json(
      { error: 'Upstream request failed', request_id: requestId },
      { status: 502 }
    )
  }
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const DELETE = proxy
export const PUT = proxy
