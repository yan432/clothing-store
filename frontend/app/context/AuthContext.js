'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { isAdminEmail } from '../lib/admin'
import { trackLogin } from '../lib/track'
import { localeFromPathname, normalizeLocale, pathForLocale } from '../lib/i18n'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  const setAdmCookie = useCallback((session) => {
    // Set/clear via a server-side route so the cookie gets HttpOnly flag —
    // document.cookie cannot set HttpOnly, making the token readable by any JS.
    fetch('/api/auth/set-admin-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session?.access_token ?? null }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAdmCookie(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAdmCookie(session)
    })

    return () => subscription.unsubscribe()
  }, [setAdmCookie, supabase.auth])

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
    return { data, error, isExistingUser }
  }

  async function resendSignUpVerification(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    return { error }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) trackLogin(email)
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function requestPasswordReset(email) {
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
    const { error } = await supabase.auth.updateUser({ password: nextPassword })
    return { error }
  }

  async function updateEmail(nextEmail) {
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
