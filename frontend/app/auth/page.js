'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../lib/api'
import { trackCompleteRegistration, trackNewsletterSignup } from '../lib/track'
import { normalizeLocale, pathForLocale } from '../lib/i18n'

const AUTH_COPY = {
  en: {
    welcome: 'Welcome back',
    create: 'Create account',
    signInSubtitle: 'Sign in to your account',
    signUpSubtitle: 'Join us today',
    password: 'Password',
    confirmPassword: 'Confirm password',
    show: 'Show',
    hide: 'Hide',
    forgot: 'Forgot password?',
    passwordRequired: 'Password does not meet security requirements',
    passwordMismatch: 'Passwords do not match',
    existingUser: 'This email is already registered. Please sign in or reset your password.',
    verificationSent: 'Verification link sent to your email. Open it to finish creating your account.',
    enterEmail: 'Enter your email first',
    resetSent: 'Password reset link sent to your email. If you don\'t see it, check your spam folder.',
    newVerification: 'New verification link sent.',
    passwordStrength: 'Password strength',
    strength: { weak: 'Weak', medium: 'Medium', strong: 'Strong' },
    checks: {
      length: 'At least 8 characters',
      lower: 'At least one lowercase letter',
      upper: 'At least one uppercase letter',
      digit: 'At least one number',
    },
    newsletter: 'I want to receive newsletter updates',
    loading: 'Loading...',
    signIn: 'Sign in',
    signUp: 'Sign up',
    sentTo: 'Verification link sent to',
    openInbox: 'Open the link in your inbox to verify your account. If you do not see it, check your spam folder.',
    resend: 'Resend link',
    noAccount: "Don't have an account? ",
    hasAccount: 'Already have an account? ',
  },
  uk: {
    welcome: 'З поверненням',
    create: 'Створити акаунт',
    signInSubtitle: 'Увійди у свій акаунт',
    signUpSubtitle: 'Приєднуйся до edm.clothes',
    password: 'Пароль',
    confirmPassword: 'Підтвердь пароль',
    show: 'Показати',
    hide: 'Сховати',
    forgot: 'Забув пароль?',
    passwordRequired: 'Пароль не відповідає вимогам безпеки',
    passwordMismatch: 'Паролі не збігаються',
    existingUser: 'Цей email вже зареєстрований. Увійди або скинь пароль.',
    verificationSent: 'Посилання для підтвердження надіслано на email. Відкрий його, щоб завершити створення акаунта.',
    enterEmail: 'Спочатку введи email',
    resetSent: 'Посилання для скидання пароля надіслано на email. Якщо не бачиш листа, перевір спам.',
    newVerification: 'Нове посилання для підтвердження надіслано.',
    passwordStrength: 'Надійність пароля',
    strength: { weak: 'Слабкий', medium: 'Середній', strong: 'Надійний' },
    checks: {
      length: 'Мінімум 8 символів',
      lower: 'Хоча б одна мала літера',
      upper: 'Хоча б одна велика літера',
      digit: 'Хоча б одна цифра',
    },
    newsletter: 'Хочу отримувати новини та пропозиції',
    loading: 'Завантаження...',
    signIn: 'Увійти',
    signUp: 'Зареєструватися',
    sentTo: 'Посилання для підтвердження надіслано на',
    openInbox: 'Відкрий посилання у пошті, щоб підтвердити акаунт. Якщо листа немає, перевір спам.',
    resend: 'Надіслати ще раз',
    noAccount: 'Ще немає акаунта? ',
    hasAccount: 'Вже є акаунт? ',
  },
}

export default function AuthPage({ locale = 'en' }) {
  const preferredLocale = normalizeLocale(locale)
  const t = AUTH_COPY[preferredLocale]
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return 'signin'
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') === 'register' ? 'signup' : 'signin'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [newsletterOptIn, setNewsletterOptIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, signIn, signUp, resendSignUpVerification, requestPasswordReset } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.push(pathForLocale('/', preferredLocale))
  }, [preferredLocale, router, user])

  const passwordChecks = [
    { id: 'length', label: t.checks.length, valid: password.length >= 8 },
    { id: 'lower', label: t.checks.lower, valid: /[a-z]/.test(password) },
    { id: 'upper', label: t.checks.upper, valid: /[A-Z]/.test(password) },
    { id: 'digit', label: t.checks.digit, valid: /\d/.test(password) },
  ]
  const isPasswordValid = passwordChecks.every((rule) => rule.valid)
  const passwordScore = passwordChecks.filter((rule) => rule.valid).length
  const passwordStrength = passwordScore <= 2 ? t.strength.weak : passwordScore === 3 ? t.strength.medium : t.strength.strong
  const passwordStrengthColor = passwordScore <= 2 ? '#b91c1c' : passwordScore === 3 ? '#b45309' : '#15803d'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else router.push(pathForLocale('/', preferredLocale))
    } else {
      if (!isPasswordValid) {
        setError(t.passwordRequired)
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError(t.passwordMismatch)
        setLoading(false)
        return
      }
      const { error, isExistingUser } = await signUp(email, password, {
        preferredLocale,
        redirectPath: pathForLocale('/auth', preferredLocale),
      })
      if (error) setError(error.message)
      else if (isExistingUser) setError(t.existingUser)
      else {
        const normalizedEmail = email.trim().toLowerCase()
        setPendingVerificationEmail(normalizedEmail)
        if (newsletterOptIn) {
          try {
            await fetch(getApiUrl('/email-subscribers/capture'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: normalizedEmail,
                source: 'signup',
                preferred_locale: preferredLocale,
                metadata: { preferred_locale: preferredLocale },
              }),
            })
            trackNewsletterSignup({ source: 'signup' })
          } catch (_) {}
        }
        trackCompleteRegistration({ source: 'account_signup' })
        setMessage(t.verificationSent)
      }
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    setError('')
    setMessage('')
    const targetEmail = email.trim().toLowerCase()
    if (!targetEmail) {
      setError(t.enterEmail)
      return
    }
    setLoading(true)
    const { error } = await requestPasswordReset(targetEmail)
    if (error) setError(error.message)
    else setMessage(t.resetSent)
    setLoading(false)
  }

  async function handleResendVerification() {
    if (!pendingVerificationEmail) return
    setError('')
    setMessage('')
    setLoading(true)
    const { error } = await resendSignUpVerification(pendingVerificationEmail)
    if (error) setError(error.message)
    else setMessage(t.newVerification)
    setLoading(false)
  }

  return (
    <main style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:400}}>
        <h1 style={{fontSize:28,fontWeight:600,marginBottom:8,textAlign:'center'}}>
          {mode === 'signin' ? t.welcome : t.create}
        </h1>
        <p style={{textAlign:'center',color:'#aaa',fontSize:14,marginBottom:32}}>
          {mode === 'signin' ? t.signInSubtitle : t.signUpSubtitle}
        </p>

        {error && (
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:14,color:'#dc2626'}}>
            {error}
          </div>
        )}

        {message && (
          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:14,color:'#16a34a'}}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input
            id="auth-email"
            name="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{padding:'14px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}
          />
          <div style={{position:'relative'}}>
            <input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t.password}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{padding:'14px 72px 14px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',cursor:'pointer',fontSize:12,color:'#666'}}
            >
              {showPassword ? t.hide : t.show}
            </button>
          </div>
          {mode === 'signin' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{background:'none',border:'none',padding:0,textAlign:'left',fontSize:13,color:'#555',textDecoration:'underline',cursor:'pointer',width:'fit-content'}}
            >
              {t.forgot}
            </button>
          )}
          {mode === 'signup' && (
            <>
              <div style={{position:'relative'}}>
                <input
                  id="auth-confirm-password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t.confirmPassword}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{padding:'14px 72px 14px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',cursor:'pointer',fontSize:12,color:'#666'}}
                >
                  {showConfirmPassword ? t.hide : t.show}
                </button>
              </div>
              <div style={{border:'1px solid #ecece8',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#666'}}>
                <p style={{margin:'0 0 6px',fontWeight:600,color:passwordStrengthColor}}>{t.passwordStrength}: {passwordStrength}</p>
                {passwordChecks.map((rule) => (
                  <p key={rule.id} style={{margin:'2px 0',color:rule.valid ? '#15803d' : '#666'}}>
                    {rule.valid ? '✓' : '•'} {rule.label}
                  </p>
                ))}
              </div>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#555',cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={newsletterOptIn}
                  onChange={(e) => setNewsletterOptIn(e.target.checked)}
                />
                {t.newsletter}
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{background:'#000',color:'#fff',padding:'14px',borderRadius:999,fontSize:14,fontWeight:500,border:'none',cursor:'pointer',marginTop:4,opacity: loading ? 0.6 : 1}}>
            {loading ? t.loading : mode === 'signin' ? t.signIn : t.create}
          </button>
        </form>

        {mode === 'signup' && pendingVerificationEmail && (
          <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:10,border:'1px solid #ecece8',borderRadius:12,padding:'12px 14px'}}>
            <p style={{margin:0,fontSize:13,color:'#555'}}>{t.sentTo} <strong>{pendingVerificationEmail}</strong></p>
            <p style={{margin:0,fontSize:13,color:'#777',lineHeight:1.5}}>
              {t.openInbox}
            </p>
            <div style={{display:'flex',gap:8}}>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                style={{background:'#fff',color:'#222',padding:'10px 14px',borderRadius:999,fontSize:13,fontWeight:500,border:'1px solid #ddd',cursor:'pointer',opacity: loading ? 0.6 : 1}}
              >
                {t.resend}
              </button>
            </div>
          </div>
        )}

        <p style={{textAlign:'center',fontSize:14,color:'#aaa',marginTop:24}}>
          {mode === 'signin' ? t.noAccount : t.hasAccount}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
              setMessage('')
              setPassword('')
              setConfirmPassword('')
              setPendingVerificationEmail('')
              setShowPassword(false)
              setShowConfirmPassword(false)
            }}
            style={{background:'none',border:'none',color:'#000',fontWeight:500,cursor:'pointer',fontSize:14}}>
            {mode === 'signin' ? t.signUp : t.signIn}
          </button>
        </p>
      </div>
    </main>
  )
}
