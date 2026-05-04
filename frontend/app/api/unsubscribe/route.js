import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const BACKEND = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'https://clothing-store-2e9s.onrender.com'
).replace(/\/$/, '')

const ADMIN_SECRET = process.env.BACKEND_ADMIN_SECRET || ''

function makeUnsubToken(email) {
  return createHmac('sha256', ADMIN_SECRET)
    .update(`unsub:${email.toLowerCase().trim()}`)
    .digest('hex')
}

export async function POST(request) {
  const { email } = await request.json().catch(() => ({}))
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const res = await fetch(`${BACKEND}/email-subscribers/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, token: makeUnsubToken(normalized) }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
