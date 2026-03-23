'use client'

import { useEffect, useMemo, useState } from 'react'
import { getApiUrl } from '../lib/api'

const SESSION_KEY = 'email-popup-dismissed'

export default function EmailCapturePopup() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const canShow = useMemo(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem(SESSION_KEY)
  }, [])

  useEffect(() => {
    if (!canShow) return
    const onScroll = () => {
      if (window.scrollY < 320) return
      setVisible(true)
      window.removeEventListener('scroll', onScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [canShow])

  function closePopup() {
    setVisible(false)
    if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1')
  }

  async function submit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(getApiUrl('/email-subscribers/capture'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: 'scroll_popup',
          metadata: { offer: 'free_shipping_first_order' },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to subscribe')
      }
      setMessage('Thanks! Free shipping offer will be applied to your first order.')
      setTimeout(closePopup, 1400)
    } catch (_) {
      setMessage('Could not save your email right now.')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <div style={{position:'fixed',right:18,bottom:18,zIndex:90,width:'min(360px, calc(100vw - 24px))',background:'#fff',border:'1px solid #ecece6',borderRadius:14,boxShadow:'0 18px 44px rgba(0,0,0,0.12)',padding:14}}>
      <button
        type="button"
        onClick={closePopup}
        aria-label="Close popup"
        style={{position:'absolute',right:10,top:8,border:'none',background:'none',fontSize:18,cursor:'pointer',color:'#666'}}
      >
        ×
      </button>
      <p style={{margin:'0 0 8px',fontSize:17,fontWeight:600}}>Free shipping on your first order</p>
      <p style={{margin:'0 0 10px',fontSize:13,color:'#666660'}}>Leave your email to unlock the offer.</p>
      <form onSubmit={submit} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8}}>
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{border:'1px solid #ddd',borderRadius:10,padding:'10px 12px',fontSize:14}}
        />
        <button
          type="submit"
          disabled={loading}
          style={{border:'none',background:'#111',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:13,cursor:'pointer',opacity:loading ? 0.7 : 1}}
        >
          {loading ? '...' : 'Get offer'}
        </button>
      </form>
      {message ? <p style={{margin:'8px 0 0',fontSize:12,color:'#5f5f59'}}>{message}</p> : null}
    </div>
  )
}
