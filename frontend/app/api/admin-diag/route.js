/**
 * Diagnostic endpoint: tells you exactly where the 403 is coming from.
 * Visit /api/admin-diag in the browser while logged in as admin.
 * DELETE THIS FILE after debugging is done.
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

export async function GET() {
  const result = {
    env: {
      has_backend_admin_secret: !!BACKEND_ADMIN_SECRET,
      secret_length: BACKEND_ADMIN_SECRET.length,
      admin_emails: ADMIN_EMAILS,
      backend_url: BACKEND,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    },
    method1_adm_tok: { status: 'not_tried', user_email: null, is_admin: false },
    method2_ssr: { status: 'not_tried', user_email: null, is_admin: false },
    backend_ping: { status: 'not_tried', http_status: null },
  }

  const cookieStore = await cookies()
  const allCookieNames = cookieStore.getAll().map(c => c.name)
  result.cookie_names = allCookieNames

  // Method 1: adm_tok
  try {
    const admTok = cookieStore.get('adm_tok')?.value
    if (admTok) {
      result.method1_adm_tok.has_token = true
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const { data: { user }, error } = await supabase.auth.getUser(admTok)
      result.method1_adm_tok.user_email = user?.email || null
      result.method1_adm_tok.is_admin = isAdminEmail(user?.email)
      result.method1_adm_tok.error = error?.message || null
      result.method1_adm_tok.status = user ? 'verified' : 'invalid_token'
    } else {
      result.method1_adm_tok.has_token = false
      result.method1_adm_tok.status = 'no_cookie'
    }
  } catch (e) {
    result.method1_adm_tok.status = 'error'
    result.method1_adm_tok.error = e.message
  }

  // Method 2: SSR session
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    result.method2_ssr.user_email = user?.email || null
    result.method2_ssr.is_admin = isAdminEmail(user?.email)
    result.method2_ssr.error = error?.message || null
    result.method2_ssr.status = user ? 'verified' : 'no_session'
  } catch (e) {
    result.method2_ssr.status = 'error'
    result.method2_ssr.error = e.message
  }

  // Backend ping (with admin secret)
  if (BACKEND_ADMIN_SECRET) {
    try {
      const res = await fetch(`${BACKEND}/homepage-slides/admin`, {
        headers: { 'X-Admin-Secret': BACKEND_ADMIN_SECRET },
      })
      result.backend_ping.http_status = res.status
      result.backend_ping.status = res.ok ? 'ok' : 'failed'
      if (!res.ok) {
        result.backend_ping.body = await res.text()
      }
    } catch (e) {
      result.backend_ping.status = 'error'
      result.backend_ping.error = e.message
    }
  } else {
    result.backend_ping.status = 'skipped_no_secret'
  }

  return NextResponse.json(result, { status: 200 })
}
