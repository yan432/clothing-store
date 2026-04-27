'use client'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../lib/api'

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [newsletterOptIn, setNewsletterOptIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, verifySignUpCode, resendSignUpCode, requestPasswordReset } = useAuth()
  const router = useRouter()

  const passwordChecks = [
    { id: 'length', label: 'At least 8 characters', valid: password.length >= 8 },
    { id: 'lower', label: 'At least one lowercase letter', valid: /[a-z]/.test(password) },
    { id: 'upper', label: 'At least one uppercase letter', valid: /[A-Z]/.test(password) },
    { id: 'digit', label: 'At least one number', valid: /\d/.test(password) },
  ]
  const isPasswordValid = passwordChecks.every((rule) => rule.valid)
  const passwordScore = passwordChecks.filter((rule) => rule.valid).length
  const passwordStrength = passwordScore <= 2 ? 'Weak' : passwordScore === 3 ? 'Medium' : 'Strong'
  const passwordStrengthColor = passwordScore <= 2 ? '#b91c1c' : passwordScore === 3 ? '#b45309' : '#15803d'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else router.push('/')
    } else {
      if (!isPasswordValid) {
        setError('Password does not meet security requirements')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      const { error, isExistingUser } = await signUp(email, password)
      if (error) setError(error.message)
      else if (isExistingUser) setError('This email is already registered. Please sign in or reset your password.')
      else {
        setPendingVerificationEmail(email.trim().toLowerCase())
        setMessage('Enter the verification code sent to your email.')
      }
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    setError('')
    setMessage('')
    const targetEmail = email.trim().toLowerCase()
    if (!targetEmail) {
      setError('Enter your email first')
      return
    }
    setLoading(true)
    const { error } = await requestPasswordReset(targetEmail)
    if (error) setError(error.message)
    else setMessage('Password reset link sent to your email. If you don\'t see it, check your spam folder.')
    setLoading(false)
  }

  async function handleVerifyCode(e) {
    e.preventDefault()
    if (!pendingVerificationEmail || !verifyCode.trim()) return
    setError('')
    setMessage('')
    setLoading(true)
    const { error } = await verifySignUpCode(pendingVerificationEmail, verifyCode.trim())
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (newsletterOptIn) {
      try {
        await fetch(getApiUrl('/email-subscribers/capture'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingVerificationEmail, source: 'signup' }),
        })
      } catch (_) {}
    }
    setLoading(false)
    router.push('/')
  }

  async function handleResendCode() {
    if (!pendingVerificationEmail) return
    setError('')
    setMessage('')
    setLoading(true)
    const { error } = await resendSignUpCode(pendingVerificationEmail)
    if (error) setError(error.message)
    else setMessage('New verification code sent.')
    setLoading(false)
  }

  return (
    <main style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:400}}>
        <h1 style={{fontSize:28,fontWeight:600,marginBottom:8,textAlign:'center'}}>
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h1>
        <p style={{textAlign:'center',color:'#aaa',fontSize:14,marginBottom:32}}>
          {mode === 'signin' ? 'Sign in to your account' : 'Join us today'}
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
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{padding:'14px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}
          />
          <div style={{position:'relative'}}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
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
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {mode === 'signin' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{background:'none',border:'none',padding:0,textAlign:'left',fontSize:13,color:'#555',textDecoration:'underline',cursor:'pointer',width:'fit-content'}}
            >
              Forgot password?
            </button>
          )}
          {mode === 'signup' && (
            <>
              <div style={{position:'relative'}}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
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
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div style={{border:'1px solid #ecece8',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#666'}}>
                <p style={{margin:'0 0 6px',fontWeight:600,color:passwordStrengthColor}}>Password strength: {passwordStrength}</p>
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
                I want to receive newsletter updates
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{background:'#000',color:'#fff',padding:'14px',borderRadius:999,fontSize:14,fontWeight:500,border:'none',cursor:'pointer',marginTop:4,opacity: loading ? 0.6 : 1}}>
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {mode === 'signup' && pendingVerificationEmail && (
          <form onSubmit={handleVerifyCode} style={{marginTop:16,display:'flex',flexDirection:'column',gap:10,border:'1px solid #ecece8',borderRadius:12,padding:'12px 14px'}}>
            <p style={{margin:0,fontSize:13,color:'#555'}}>Verification code for <strong>{pendingVerificationEmail}</strong></p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              style={{padding:'12px 14px',borderRadius:10,border:'1px solid #e5e5e3',fontSize:14,outline:'none'}}
            />
            <div style={{display:'flex',gap:8}}>
              <button
                type="submit"
                disabled={loading}
                style={{background:'#000',color:'#fff',padding:'10px 14px',borderRadius:999,fontSize:13,fontWeight:500,border:'none',cursor:'pointer',opacity: loading ? 0.6 : 1}}
              >
                Verify code
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                style={{background:'#fff',color:'#222',padding:'10px 14px',borderRadius:999,fontSize:13,fontWeight:500,border:'1px solid #ddd',cursor:'pointer',opacity: loading ? 0.6 : 1}}
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <p style={{textAlign:'center',fontSize:14,color:'#aaa',marginTop:24}}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
              setMessage('')
              setPassword('')
              setConfirmPassword('')
              setPendingVerificationEmail('')
              setVerifyCode('')
              setShowPassword(false)
              setShowConfirmPassword(false)
            }}
            style={{background:'none',border:'none',color:'#000',fontWeight:500,cursor:'pointer',fontSize:14}}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  )
}