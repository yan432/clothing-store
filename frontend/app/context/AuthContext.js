'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { isAdminEmail } from '../lib/admin'
import { trackLogin } from '../lib/track'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
  }, [])

  function setAdmCookie(session) {
    if (typeof document === 'undefined') return
    if (session?.access_token) {
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `adm_tok=${session.access_token}; path=/; max-age=3600; SameSite=Lax${secure}`
    } else {
      document.cookie = 'adm_tok=; path=/; max-age=0; SameSite=Lax'
    }
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    const identities = Array.isArray(data?.user?.identities) ? data.user.identities : null
    const isExistingUser = !error && identities !== null && identities.length === 0
    return { data, error, isExistingUser }
  }

  async function verifySignUpCode(email, code) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'signup',
      email,
      token: code,
    })
    return { error }
  }

  async function resendSignUpCode(email) {
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
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset`
        : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error }
  }

  async function updatePassword(nextPassword) {
    const { error } = await supabase.auth.updateUser({ password: nextPassword })
    return { error }
  }

  async function updateEmail(nextEmail) {
    const { error } = await supabase.auth.updateUser({ email: nextEmail })
    return { error }
  }

  async function reauthenticate(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const isAdmin = isAdminEmail(user?.email)

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, verifySignUpCode, resendSignUpCode, requestPasswordReset, updatePassword, updateEmail, reauthenticate, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}