'use client'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'

const STATIC_SHOP_LINKS = [
  { label: 'All products', href: '/products' },
  { label: 'New arrivals', href: '/products?special=new' },
  { label: 'Sale',         href: '/products?special=sale' },
]

const adminLinks = [
  { href: '/admin/products',     label: 'Products CMS' },
  { href: '/admin/products/new', label: 'New Product' },
  { href: '/admin/orders',       label: 'Orders' },
  { href: '/admin/promos',       label: 'Promo Codes' },
  { href: '/admin/subscribers',  label: 'Subscribers' },
]

const accountLinks = [
  { href: '/account',             label: 'My account' },
  { href: '/account?tab=orders',  label: 'Orders' },
  { href: '/account?tab=returns', label: 'Returns' },
  { href: '/account?tab=sizes',   label: 'My sizes' },
  { href: '/account?tab=help',    label: 'Help & FAQ' },
]

export default function NavBar() {
  const { count, setDrawerOpen } = useCart()
  const { user, signOut, isAdmin } = useAuth()

  const [isShopOpen,    setIsShopOpen]    = useState(false)
  const [isAdminOpen,   setIsAdminOpen]   = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [categories,    setCategories]    = useState([])

  useEffect(() => {
    fetch(getApiUrl('/categories'))
      .then(r => r.ok ? r.json() : [])
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => {})
  }, [])

  const shopRef    = useRef(null)
  const adminRef   = useRef(null)
  const profileRef = useRef(null)

  const shopTimer    = useRef(null)
  const adminTimer   = useRef(null)
  const profileTimer = useRef(null)

  // cleanup timers on unmount
  useEffect(() => () => {
    clearTimeout(shopTimer.current)
    clearTimeout(adminTimer.current)
    clearTimeout(profileTimer.current)
  }, [])

  // click-outside / escape for admin & profile
  useEffect(() => {
    if (!isAdminOpen && !isProfileOpen) return
    const onOut = e => {
      if (!adminRef.current?.contains(e.target) && !profileRef.current?.contains(e.target)) {
        setIsAdminOpen(false)
        setIsProfileOpen(false)
      }
    }
    const onEsc = e => { if (e.key === 'Escape') { setIsAdminOpen(false); setIsProfileOpen(false) } }
    document.addEventListener('mousedown', onOut)
    document.addEventListener('keydown',   onEsc)
    return () => { document.removeEventListener('mousedown', onOut); document.removeEventListener('keydown', onEsc) }
  }, [isAdminOpen, isProfileOpen])

  function hoverOpen(setFn, timerRef) {
    clearTimeout(timerRef.current)
    setFn(true)
  }
  function hoverClose(setFn, timerRef) {
    timerRef.current = setTimeout(() => setFn(false), 160)
  }

  // shared dropdown shell style
  const dropStyle = {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    background: '#fff',
    border: '1px solid #e8e8e5',
    borderRadius: 12,
    padding: '8px 0',
    boxShadow: '0 14px 34px rgba(15,15,15,0.08)',
    zIndex: 60,
    minWidth: 180,
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      borderBottom: '1px solid #f0f0ee',
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(12px)',
      padding: '0 28px',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      height: 58,
    }}>

      {/* LEFT — logo */}
      <a href="/" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none', color: 'inherit', justifySelf: 'start' }}>
        edm.clothes
      </a>

      {/* CENTER — nav links */}
      <div style={{ display: 'flex', gap: 32, fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', alignItems: 'center' }}>

        <a href="/products?special=new" style={{ color: '#1a1a18', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          New arrivals
        </a>

        {/* Shop dropdown */}
        <div
          ref={shopRef}
          style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => hoverOpen(setIsShopOpen, shopTimer)}
          onMouseLeave={() => hoverClose(setIsShopOpen, shopTimer)}
        >
          <a
            href="/products"
            style={{ color: '#1a1a18', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            onFocus={() => hoverOpen(setIsShopOpen, shopTimer)}
          >
            Shop
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.45, marginTop: 1, transition: 'transform 0.2s', transform: isShopOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {isShopOpen && (
            <div style={{ ...dropStyle, left: '50%', transform: 'translateX(-50%)' }}>
              {STATIC_SHOP_LINKS.map(item => (
                <a key={item.href} href={item.href}
                  onClick={() => setIsShopOpen(false)}
                  style={{ display: 'block', padding: '9px 18px', fontSize: 13, color: '#1a1a18', whiteSpace: 'nowrap', textDecoration: 'none' }}
                >
                  {item.label}
                </a>
              ))}
              {categories.length > 0 && (
                <>
                  <div style={{ height: 1, background: '#f0f0ee', margin: '6px 12px' }} />
                  {categories.map(cat => (
                    <a key={cat} href={`/products?category=${encodeURIComponent(cat)}`}
                      onClick={() => setIsShopOpen(false)}
                      style={{ display: 'block', padding: '9px 18px', fontSize: 13, color: '#1a1a18', whiteSpace: 'nowrap', textDecoration: 'none' }}
                    >
                      {cat}
                    </a>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <a href="/products?special=sale" style={{ color: '#1a1a18', textDecoration: 'none' }}>
          Sale
        </a>

      </div>

      {/* RIGHT — icons */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifySelf: 'end' }}>

        {/* Admin dropdown (text link, only for admins) */}
        {isAdmin && (
          <div
            ref={adminRef}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: 8 }}
            onMouseEnter={() => hoverOpen(setIsAdminOpen, adminTimer)}
            onMouseLeave={() => hoverClose(setIsAdminOpen, adminTimer)}
          >
            <button
              type="button"
              onFocus={() => hoverOpen(setIsAdminOpen, adminTimer)}
              aria-expanded={isAdminOpen}
              aria-haspopup="menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#888', padding: 0, letterSpacing: '0.03em' }}
            >
              Admin
            </button>
            {isAdminOpen && (
              <div role="menu" style={{ ...dropStyle, right: 0, left: 'auto', minWidth: 200 }}>
                <div style={{ padding: '4px 8px 6px' }}>
                  {adminLinks.map(item => (
                    <a key={item.label} href={item.href} role="menuitem"
                      onClick={() => setIsAdminOpen(false)}
                      style={{ display: 'block', padding: '10px 12px', fontSize: 13, lineHeight: 1.2, color: '#1a1a18', borderRadius: 8, textDecoration: 'none' }}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cart icon */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open cart"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {count > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 16, height: 16, borderRadius: '50%',
              background: '#000', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {count}
            </span>
          )}
        </button>

        {/* User icon / sign in */}
        {user ? (
          <div
            ref={profileRef}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => hoverOpen(setIsProfileOpen, profileTimer)}
            onMouseLeave={() => hoverClose(setIsProfileOpen, profileTimer)}
          >
            <button
              type="button"
              onFocus={() => hoverOpen(setIsProfileOpen, profileTimer)}
              onClick={() => { window.location.href = '/account' }}
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              aria-label="Open account page"
              style={{
                width: 36, height: 36,
                border: '1px solid #d9d9d6',
                borderRadius: '50%',
                background: '#f4f4f1',
                display: 'grid', placeItems: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.1" stroke="#1a1a18" strokeWidth="1.5"/>
                <path d="M5.4 19.1c1.3-2.9 3.8-4.3 6.6-4.3 2.8 0 5.3 1.4 6.6 4.3" stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {isProfileOpen && (
              <div role="menu" style={{ ...dropStyle, right: 0, left: 'auto', width: 220 }}>
                <div style={{ padding: '4px 8px 6px' }}>
                  {accountLinks.map(item => (
                    <a key={item.label} href={item.href} role="menuitem"
                      onClick={() => setIsProfileOpen(false)}
                      style={{ display: 'block', padding: '10px 12px', fontSize: 13, lineHeight: 1.2, color: '#1a1a18', borderRadius: 8, textDecoration: 'none' }}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #efefed', padding: '8px 8px 4px' }}>
                  <button
                    type="button"
                    onClick={async () => { await signOut(); setIsProfileOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#1a1a18' }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <a href="/auth"
            style={{ background: '#000', color: '#fff', padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Sign in
          </a>
        )}
      </div>
    </nav>
  )
}
