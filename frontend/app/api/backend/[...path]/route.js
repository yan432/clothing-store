/**
 * Generic proxy: /api/backend/foo/bar → BACKEND_URL/foo/bar
 * All admin components use this so browser never makes cross-origin requests.
 */
import { NextResponse } from 'next/server'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://clothing-store-2e9s.onrender.com'
).replace(/\/$/, '')

async function proxy(request, context) {
  const { path } = await context.params
  const url = new URL(request.url)
  const target = `${BACKEND}/${path.join('/')}${url.search}`

  const init = { method: request.method }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const ct = request.headers.get('content-type') || ''
    init.headers = { 'content-type': ct }
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
