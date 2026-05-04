import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://clothing-store-2e9s.onrender.com'
).replace(/\/$/, '')

const ADMIN_SECRET = process.env.BACKEND_ADMIN_SECRET || ''

function makeUserToken(email) {
  return createHmac('sha256', ADMIN_SECRET)
    .update(`user-profile:${email.toLowerCase().trim()}`)
    .digest('hex')
}

async function getSessionUser(cookieStore) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = user.email
  const res = await fetch(
    `${BACKEND}/user-profile?email=${encodeURIComponent(email)}`,
    { headers: { 'X-User-Token': makeUserToken(email) } }
  )
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}

export async function PUT(request) {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = user.email
  const body = await request.json().catch(() => ({}))
  const res = await fetch(`${BACKEND}/user-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Token': makeUserToken(email),
    },
    // Force email to match authenticated user — ignores any email in the request body
    body: JSON.stringify({ ...body, email }),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
