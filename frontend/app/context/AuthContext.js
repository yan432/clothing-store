'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { isAdminEmail } from '../lib/admin'
import { trackLogin } from '../lib/track'
import { localeFromPathname, normalizeLocale, pathForLocale } from '../lib/i18n'

const AuthContext = createContext()

// Lazy-load the Supabase SDK (~210 KB) only when actually needed:
// either the user already has a session cookie, or they triggered an
// auth action (signIn, signUp, etc.). Anonymous visitors never download it.
let supabasePromise = null
function loadSupabase() {
  if (!supabasePromise) {
    supabasePromise = import('../lib/supabase').then(m => m.createClient())
  }
  return supabasePromise
}

// @supabase/ssr stores the session as a cookie named `sb-<project-ref>-auth-token`
// (sometimes chunked as .0/.1). Cheap pre-flight to decide if we need the SDK at all.
function hasSupabaseSessionCookie() {
  if (typeof document === 'undefined') return false
  return /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const subscriptionRef = useRef(null)
  const initedRef = useRef(false)

  const setAdmCookie = useCallback((session) => {
    // Set/clear via a server-side route so the cookie gets HttpOnly flag —
    // document.cookie cannot set HttpOnly, making the token readable by any JS.
    fetch('/api/auth/set-admin-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session?.access_token ?? null }),
    }).catch(() => {})
  }, [])

  // Bootstraps session state + subscribes to auth events. Idempotent —
  // safe to call from useEffect (existing session) or signIn/signUp (new session).
  const initAuth = useCallback(async () => {
    if (initedRef.current) return
    initedRef.current = true
    const supabase = await loadSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
    setAdmCookie(session)
    setLoading(false)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAdmCookie(session)
    })
    subscriptionRef.current = subscription
  }, [setAdmCookie])

  useEffect(() => {
    if (hasSupabaseSessionCookie()) {
      initAuth()
    } else {
      setLoading(false)
    }
    return () => {
      subscriptionRef.current?.unsubscribe()
    }
  }, [initAuth])

  useEffect(() => {
    const rawLocale = user?.user_metadata?.preferred_locale
    if (!user?.email || !rawLocale) return
    fetch('/api/user-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_locale: normalizeLocale(rawLocale) }),
    }).catch(() => {})
  }, [user?.email, user?.user_metadata?.preferred_locale])

  async function signUp(email, password, opts = {}) {
    const supabase = await loadSupabase()
    const preferredLocale = normalizeLocale(opts.preferredLocale || opts.locale)
    const redirectPath = opts.redirectPath || pathForLocale('/auth', preferredLocale)
    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}${redirectPath}`
        : undefined
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { preferred_locale: preferredLocale },
      },
    })
    const identities = Array.isArray(data?.user?.identities) ? data.user.identities : null
    const isExistingUser = !error && identities !== null && identities.length === 0
    if (!error) initAuth()
    return { data, error, isExistingUser }
  }

  async function resendSignUpVerification(email) {
    const supabase = await loadSupabase()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    return { error }
  }

  async function signIn(email, password) {
    const supabase = await loadSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      trackLogin(email)
      initAuth()
    }
    return { error }
  }

  async function signOut() {
    const supabase = await loadSupabase()
    await supabase.auth.signOut()
  }

  async function requestPasswordReset(email) {
    const supabase = await loadSupabase()
    const locale =
      typeof window !== 'undefined'
        ? localeFromPathname(window.location.pathname)
        : 'en'
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}${pathForLocale('/auth/reset', locale)}`
        : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error }
  }

  async function updatePassword(nextPassword) {
    const supabase = await loadSupabase()
    const { error } = await supabase.auth.updateUser({ password: nextPassword })
    return { error }
  }

  async function updateEmail(nextEmail) {
    const supabase = await loadSupabase()
    const locale =
      typeof window !== 'undefined'
        ? localeFromPathname(window.location.pathname)
        : 'en'
    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}${pathForLocale('/account', locale)}`
        : undefined
    const { error } = await supabase.auth.updateUser({ email: nextEmail }, { emailRedirectTo })
    return { error }
  }

  async function reauthenticate(email, password) {
    const supabase = await loadSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const isAdmin = isAdminEmail(user?.email)

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, resendSignUpVerification, requestPasswordReset, updatePassword, updateEmail, reauthenticate, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
