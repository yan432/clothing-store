import { createBrowserClient } from '@supabase/ssr'

// During static generation / SSR the NEXT_PUBLIC_ vars may not be injected yet.
// Return a no-op stub so the build doesn't crash; real auth only works in the browser.
const noopAuth = {
  getSession:          () => Promise.resolve({ data: { session: null } }),
  onAuthStateChange:   () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signUp:              () => Promise.resolve({ data: null, error: null }),
  signInWithPassword:  () => Promise.resolve({ data: null, error: null }),
  signOut:             () => Promise.resolve(),
  resetPasswordForEmail: () => Promise.resolve({ error: null }),
  updateUser:          () => Promise.resolve({ error: null }),
  resend:              () => Promise.resolve({ error: null }),
}
const noopClient = { auth: noopAuth }

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return noopClient
  return createBrowserClient(url, key)
}
