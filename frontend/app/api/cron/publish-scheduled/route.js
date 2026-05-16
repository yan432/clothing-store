import { NextResponse } from 'next/server'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  'https://clothing-store-api-935987805883.europe-west3.run.app'
).replace(/\/$/, '')

const BACKEND_ADMIN_SECRET = process.env.BACKEND_ADMIN_SECRET || ''

export async function GET(request) {
  // Only allow calls from the same server (Vercel cron) or local dev.
  // In production BACKEND_ADMIN_SECRET is always set, so an external caller
  // without it will just get a 401 from the backend anyway — but we reject
  // early here to avoid any backend round-trip.
  const host = request.headers.get('host') || ''
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isLocal = host.startsWith('localhost') || host.startsWith('127.')

  if (!isVercelCron && !isLocal) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const res = await fetch(`${BACKEND}/products/publish-scheduled`, {
      method: 'POST',
      headers: { 'X-Admin-Secret': BACKEND_ADMIN_SECRET },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('publish-scheduled cron error', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
