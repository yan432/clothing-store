'use client'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { count, setDrawerOpen } = useCart()
  const { user, signOut, isAdmin } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const menuRef = useRef(null)
  const adminMenuRef = useRef(null)
  const closeTimerRef = useRef(null)
  const closeAdminTimerRef = useRef(null)

  useEffect(() => {
    if (!isProfileOpen && !isAdminOpen) return

    const onClickOutside = (event) => {
      const profileOutside = !menuRef.current || !menuRef.current.contains(event.target)
      const adminOutside = !adminMenuRef.current || !adminMenuRef.current.contains(event.target)
      if (profileOutside && adminOutside) {
        setIsProfileOpen(false)
        setIsAdminOpen(false)
      }
    }

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false)
        setIsAdminOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [isProfileOpen, isAdminOpen])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (closeAdminTimerRef.current) clearTimeout(closeAdminTimerRef.current)
    }
  }, [])

  function openProfileMenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsAdminOpen(false)
    setIsProfileOpen(true)
  }

  function closeProfileMenuWithDelay() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setIsProfileOpen(false)
      closeTimerRef.current = null
    }, 160)
  }

  function openAdminMenu() {
    if (closeAdminTimerRef.current) {
      clearTimeout(closeAdminTimerRef.current)
      closeAdminTimerRef.current = null
    }
    setIsProfileOpen(false)
    setIsAdminOpen(true)
  }

  function closeAdminMenuWithDelay() {
    if (closeAdminTimerRef.current) clearTimeout(closeAdminTimerRef.current)
    closeAdminTimerRef.current = setTimeout(() => {
      setIsAdminOpen(false)
      closeAdminTimerRef.current = null
    }, 160)
  }

  const accountLinks = [
    { href: '/account', label: 'My account' },
    { href: '/account?tab=orders', label: 'Orders' },
    { href: '/account?tab=returns', label: 'Returns' },
    { href: '/account?tab=sizes', label: 'My sizes' },
    { href: '/account?tab=help', label: 'Help & FAQ' },
  ]
  const adminLinks = [
    { href: '/admin/products', label: 'Products CMS' },
    { href: '/admin/products/new', label: 'New Product' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/promos', label: 'Promo Codes' },
  ]

  return (
    <nav style={{position:'sticky',top:0,zIndex:50,borderBottom:'1px solid #f0f0ee',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <a href="/" style={{fontSize:15,fontWeight:600,letterSpacing:'0.1em',textDecoration:'none',color:'inherit'}}>STORE</a>
      <div style={{display:'flex',gap:24,fontSize:14,color:'#666',alignItems:'center'}}>
        <a href="/products" style={{color:'inherit',textDecoration:'none'}}>Shop</a>
        {isAdmin && (
          <div
            ref={adminMenuRef}
            style={{position:'relative',display:'flex',alignItems:'center'}}
            onMouseEnter={openAdminMenu}
            onMouseLeave={closeAdminMenuWithDelay}
          >
            <button
              type="button"
              onFocus={openAdminMenu}
              aria-expanded={isAdminOpen}
              aria-haspopup="menu"
              aria-label="Open admin menu"
              style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#444',padding:0}}
            >
              Admin
            </button>
            {isAdminOpen && (
              <div
                role="menu"
                style={{
                  position:'absolute',
                  left:0,
                  top:'100%',
                  width:200,
                  background:'#fff',
                  border:'1px solid #e8e8e5',
                  borderRadius:12,
                  padding:'8px 0',
                  marginTop:8,
                  color:'#1a1a18',
                  boxShadow:'0 14px 34px rgba(15,15,15,0.08)',
                  zIndex:60,
                }}
              >
                <div style={{padding:'4px 8px 6px'}}>
                  {adminLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setIsAdminOpen(false)}
                      style={{
                        display:'block',
                        padding:'10px 12px',
                        fontSize:14,
                        lineHeight:1.2,
                        color:'#1a1a18',
                        borderRadius:8,
                      }}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          style={{
            color: count > 0 ? '#000' : 'inherit',
            fontWeight: count > 0 ? 500 : 400,
            background:'none',
            border:'none',
            cursor:'pointer',
            fontSize:14,
            padding:0,
          }}
        >
          Cart {count > 0 ? '(' + count + ')' : '(0)'}
        </button>
        {user ? (
          <div
            ref={menuRef}
            style={{position:'relative',display:'flex',alignItems:'center',color:'#111'}}
            onMouseEnter={openProfileMenu}
            onMouseLeave={closeProfileMenuWithDelay}
          >
            <button
              type="button"
              onFocus={openProfileMenu}
              onClick={() => { window.location.href = '/account' }}
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              aria-label="Open account page"
              style={{
                width:38,
                height:38,
                border:'1px solid #d9d9d6',
                borderRadius:'999px',
                background:'#f4f4f1',
                display:'grid',
                placeItems:'center',
                cursor:'pointer',
                padding:0,
                transition:'border-color 0.18s ease, background 0.18s ease',
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.1" stroke="#1a1a18" strokeWidth="1.5" />
                <path d="M5.4 19.1c1.3-2.9 3.8-4.3 6.6-4.3 2.8 0 5.3 1.4 6.6 4.3" stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {isProfileOpen && (
              <div
                role="menu"
                style={{
                  position:'absolute',
                  right:0,
                  top:'100%',
                  width:240,
                  background:'#fff',
                  border:'1px solid #e8e8e5',
                  borderRadius:12,
                  padding:'8px 0',
                  marginTop:8,
                  color:'#1a1a18',
                  boxShadow:'0 14px 34px rgba(15,15,15,0.08)',
                }}
              >
                <div style={{padding:'4px 8px 6px'}}>
                  {accountLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                      style={{
                        display:'block',
                        padding:'10px 12px',
                        fontSize:14,
                        lineHeight:1.2,
                        color:'#1a1a18',
                        borderRadius:8,
                      }}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
                <div style={{borderTop:'1px solid #efefed',padding:'8px 8px 4px'}}>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut()
                      setIsProfileOpen(false)
                    }}
                    style={{
                      width:'100%',
                      textAlign:'left',
                      border:'none',
                      background:'transparent',
                      padding:'10px 12px',
                      borderRadius:8,
                      cursor:'pointer',
                      fontSize:14,
                      fontWeight:500,
                      color:'#1a1a18',
                    }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <a href="/auth" style={{background:'#000',color:'#fff',padding:'6px 16px',borderRadius:999,fontSize:13,textDecoration:'none'}}>
            Sign in
          </a>
        )}
      </div>
    </nav>
  )
}