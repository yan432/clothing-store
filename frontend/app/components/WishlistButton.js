'use client'
import { useState } from 'react'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'

/**
 * Heart button for product cards and product pages.
 * Shows a login prompt if the user is not signed in.
 */
export default function WishlistButton({ productId, style = {} }) {
  const { isWishlisted, toggle } = useWishlist()
  const { user } = useAuth()
  const [showPrompt, setShowPrompt] = useState(false)
  const [animating, setAnimating]   = useState(false)

  const active = isWishlisted(productId)

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      setShowPrompt(true)
      return
    }

    setAnimating(true)
    await toggle(productId)
    setTimeout(() => setAnimating(false), 300)
  }

  return (
    <>
      <button
        onClick={handleClick}
        title={active ? 'Remove from wishlist' : 'Save to wishlist'}
        style={{
          background: 'rgba(255,255,255,0.9)',
          border: 'none',
          borderRadius: '50%',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          transition: 'transform 0.15s ease, background 0.15s ease',
          transform: animating ? 'scale(1.25)' : 'scale(1)',
          flexShrink: 0,
          ...style,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? '#111' : 'none'}
          stroke={active ? '#111' : '#555'} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>

      {/* Login prompt popup */}
      {showPrompt && (
        <>
          <div
            onClick={() => setShowPrompt(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 998,
              background: 'rgba(0,0,0,0.4)',
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 999,
            width: 'min(340px, calc(100vw - 32px))',
            background: '#fff',
            borderRadius: 16,
            padding: 28,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            textAlign: 'center',
          }}>
            <button
              onClick={() => setShowPrompt(false)}
              style={{
                position: 'absolute', top: 14, right: 16,
                background: 'none', border: 'none',
                fontSize: 20, color: '#999', cursor: 'pointer', lineHeight: 1,
              }}
            >×</button>

            <p style={{ fontSize: 28, margin: '0 0 12px' }}>♡</p>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
              Save to your wishlist
            </p>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>
              Sign in or create an account to save items and get notified about sales and restocks.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href="/account"
                style={{
                  background: '#111', color: '#fff',
                  padding: '13px 24px', borderRadius: 999,
                  fontSize: 14, fontWeight: 600,
                  textDecoration: 'none', display: 'block',
                }}
              >
                Sign in
              </a>
              <a
                href="/account"
                style={{
                  background: '#fff', color: '#111',
                  border: '1.5px solid #e5e5e3',
                  padding: '13px 24px', borderRadius: 999,
                  fontSize: 14, fontWeight: 500,
                  textDecoration: 'none', display: 'block',
                }}
              >
                Create account
              </a>
            </div>
          </div>
        </>
      )}
    </>
  )
}
