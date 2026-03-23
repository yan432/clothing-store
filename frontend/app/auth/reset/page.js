'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)

  const checks = [
    { id: 'length', label: 'At least 8 characters', valid: password.length >= 8 },
    { id: 'lower', label: 'At least one lowercase letter', valid: /[a-z]/.test(password) },
    { id: 'upper', label: 'At least one uppercase letter', valid: /[A-Z]/.test(password) },
    { id: 'digit', label: 'At least one number', valid: /\d/.test(password) },
  ]
  const isValid = checks.every((rule) => rule.valid)

  useEffect(() => {
    let cancelled = false
    async function bootstrapRecoverySession() {
      setError('')
      setMessage('')
      const url = new URL(window.location.href)
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
      const queryParams = url.searchParams

      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const tokenHash = queryParams.get('token_hash')
      const type = queryParams.get('type')
      const code = queryParams.get('code')

      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          if (!cancelled) setReady(true)
          return
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          if (!cancelled) setReady(true)
          return
        }

        if (tokenHash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          })
          if (error) throw error
          if (!cancelled) setReady(true)
          return
        }

        if (!cancelled) setError('Reset link is invalid or expired. Request a new password reset email.')
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Reset link is invalid or expired. Request a new password reset email.')
      }
    }
    bootstrapRecoverySession()
    return () => { cancelled = true }
  }, [supabase])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!isValid) {
      setError('Password does not meet security requirements')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await updatePassword(password)
    if (error) setError(error.message)
    else {
      setMessage('Password updated. You can sign in now.')
      setTimeout(() => router.push('/auth'), 900)
    }
    setLoading(false)
  }

  return (
    <main style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:420}}>
        <h1 style={{fontSize:28,fontWeight:600,marginBottom:8,textAlign:'center'}}>Reset password</h1>
        <p style={{textAlign:'center',color:'#888',fontSize:14,marginBottom:24}}>
          {ready ? 'Set a new secure password for your account.' : 'Validating reset link...'}
        </p>
        {error ? <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 16px',marginBottom:12,fontSize:14,color:'#dc2626'}}>{error}</div> : null}
        {message ? <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:12,fontSize:14,color:'#16a34a'}}>{message}</div> : null}
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12,opacity:ready ? 1 : 0.6,pointerEvents:ready ? 'auto' : 'none'}}>
          <div style={{position:'relative'}}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!ready}
              style={{padding:'14px 72px 14px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}
            />
            <button type="button" disabled={!ready} onClick={() => setShowPassword((v) => !v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',cursor:ready ? 'pointer' : 'default',fontSize:12,color:'#666'}}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{position:'relative'}}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={!ready}
              style={{padding:'14px 72px 14px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}
            />
            <button type="button" disabled={!ready} onClick={() => setShowConfirmPassword((v) => !v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',cursor:ready ? 'pointer' : 'default',fontSize:12,color:'#666'}}>
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{border:'1px solid #ecece8',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#666'}}>
            {checks.map((rule) => (
              <p key={rule.id} style={{margin:'2px 0',color:rule.valid ? '#15803d' : '#666'}}>
                {rule.valid ? '✓' : '•'} {rule.label}
              </p>
            ))}
          </div>
          <button type="submit" disabled={loading || !ready} style={{background:'#000',color:'#fff',padding:'14px',borderRadius:999,fontSize:14,fontWeight:500,border:'none',cursor:ready ? 'pointer' : 'default',opacity:loading || !ready ? 0.6 : 1}}>
            {loading ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      </div>
    </main>
  )
}
