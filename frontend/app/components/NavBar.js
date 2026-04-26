'use client'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../lib/api'

const SHOP_STATIC = [
  { label: 'All products', href: '/products' },
  { label: 'New arrivals', href: '/products?special=new' },
  { label: 'Sale',         href: '/products?special=sale' },
]

const INFO_LINKS = [
  { label: 'Contact us',         href: 'mailto:info@edmclothes.com' },
  { label: 'Shipping info',      href: '/shipping' },
  { label: 'Returns & exchanges',href: '/returns' },
  { label: 'Size guide',         href: '/size-guide' },
  { label: 'FAQ',                href: '/faq' },
]

const ADMIN_LINKS = [
  { href: '/admin/products',     label: 'Products CMS' },
  { href: '/admin/products/new', label: 'New Product' },
  { href: '/admin/orders',       label: 'Orders' },
  { href: '/admin/promos',       label: 'Promo Codes' },
  { href: '/admin/subscribers',  label: 'Subscribers' },
]

const ACCOUNT_LINKS = [
  { href: '/account',             label: 'My account' },
  { href: '/account?tab=orders',  label: 'Orders' },
  { href: '/account?tab=returns', label: 'Returns' },
  { href: '/account?tab=sizes',   label: 'My sizes' },
  { href: '/account?tab=help',    label: 'Help & FAQ' },
]

export default function NavBar() {
  const { count, setDrawerOpen } = useCart()
  const { user, signOut, isAdmin } = useAuth()

  const [openMenu,      setOpenMenu]      = useState(null) // 'shop' | 'info' | 'admin' | 'profile'
  const [categories,    setCategories]    = useState([])

  const navLeaveTimer   = useRef(null)
  const adminRef        = useRef(null)
  const profileRef      = useRef(null)

  useEffect(() => {
    fetch(getApiUrl('/categories'))
      .then(r => r.ok ? r.json() : [])
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => {})
  }, [])

  useEffect(() => () => clearTimeout(navLeaveTimer.current), [])

  // click-outside for admin / profile small dropdowns
  useEffect(() => {
    if (openMenu !== 'admin' && openMenu !== 'profile') return
    const handler = e => {
      if (!adminRef.current?.contains(e.target) && !profileRef.current?.contains(e.target))
        setOpenMenu(null)
    }
    const esc = e => { if (e.key === 'Escape') setOpenMenu(null) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc) }
  }, [openMenu])

  // Mega-menu: enter = open, leave nav = close (with small delay so user can move to panel)
  function onNavMouseLeave() {
    navLeaveTimer.current = setTimeout(() => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m), 150)
  }
  function onNavMouseEnter() {
    clearTimeout(navLeaveTimer.current)
  }

  function openMega(menu) {
    clearTimeout(navLeaveTimer.current)
    setOpenMenu(menu)
  }

  // small dropdown style for admin / profile
  const smallDrop = {
    position: 'absolute', top: 'calc(100% + 10px)',
    background: '#fff', border: '1px solid #e8e8e5',
    borderRadius: 12, padding: '8px 0',
    boxShadow: '0 14px 34px rgba(15,15,15,0.08)',
    zIndex: 70,
  }

  const isMegaOpen = openMenu === 'shop' || openMenu === 'info'

  return (
    <>
      <nav
        onMouseEnter={onNavMouseEnter}
        onMouseLeave={onNavMouseLeave}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: isMegaOpen ? '1px solid transparent' : '1px solid #f0f0ee',
        }}
      >
        {/* Main bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          height: 58,
          padding: '0 28px',
        }}>

          {/* LEFT — logo */}
          <a href="/" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none', color: 'inherit', justifySelf: 'start' }}>
            edm.clothes
          </a>

          {/* CENTER — nav links */}
          <div style={{ display: 'flex', gap: 36, fontSize: 13, fontWeight: 500, letterSpacing: '0.05em', alignItems: 'center' }}>

            <a href="/products?special=new"
              style={{ color: '#1a1a18', textDecoration: 'none', whiteSpace: 'nowrap' }}
              onMouseEnter={() => setOpenMenu(null)}
            >
              New arrivals
            </a>

            <button
              type="button"
              onMouseEnter={() => openMega('shop')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, letterSpacing: '0.05em',
                color: '#1a1a18', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
                borderBottom: openMenu === 'shop' ? '1.5px solid #1a1a18' : '1.5px solid transparent',
                paddingBottom: 2,
              }}
            >
              Shop
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.4, marginTop: 1, transition: 'transform 0.2s', transform: openMenu === 'shop' ? 'rotate(180deg)' : 'none' }}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button
              type="button"
              onMouseEnter={() => openMega('info')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, letterSpacing: '0.05em',
                color: '#1a1a18', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
                borderBottom: openMenu === 'info' ? '1.5px solid #1a1a18' : '1.5px solid transparent',
                paddingBottom: 2,
              }}
            >
              Info
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.4, marginTop: 1, transition: 'transform 0.2s', transform: openMenu === 'info' ? 'rotate(180deg)' : 'none' }}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

          </div>

          {/* RIGHT — icons */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifySelf: 'end' }}>

            {/* Admin (text, small dropdown) */}
            {isAdmin && (
              <div
                ref={adminRef}
                style={{ position: 'relative', marginRight: 8 }}
                onMouseEnter={() => { clearTimeout(navLeaveTimer.current); setOpenMenu('admin') }}
                onMouseLeave={onNavMouseLeave}
              >
                <button type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#999', padding: '8px 4px', letterSpacing: '0.04em' }}
                >
                  Admin
                </button>
                {openMenu === 'admin' && (
                  <div role="menu" style={{ ...smallDrop, right: 0, left: 'auto', minWidth: 200 }}>
                    <div style={{ padding: '4px 8px 6px' }}>
                      {ADMIN_LINKS.map(item => (
                        <a key={item.label} href={item.href} role="menuitem"
                          onClick={() => setOpenMenu(null)}
                          style={{ display: 'block', padding: '10px 12px', fontSize: 13, color: '#1a1a18', borderRadius: 8, textDecoration: 'none' }}
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
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open cart"
              onMouseEnter={() => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 9, color: '#1a1a18', display: 'flex', alignItems: 'center', position: 'relative' }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {count > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 5,
                  width: 15, height: 15, borderRadius: '50%',
                  background: '#111', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>

            {/* User icon / sign in */}
            {user ? (
              <div
                ref={profileRef}
                style={{ position: 'relative' }}
                onMouseEnter={() => { clearTimeout(navLeaveTimer.current); setOpenMenu('profile') }}
                onMouseLeave={onNavMouseLeave}
              >
                <button type="button"
                  onClick={() => { window.location.href = '/account' }}
                  aria-label="Account"
                  style={{ width: 36, height: 36, border: '1px solid #d9d9d6', borderRadius: '50%', background: '#f4f4f1', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="3.1" stroke="#1a1a18" strokeWidth="1.5"/>
                    <path d="M5.4 19.1c1.3-2.9 3.8-4.3 6.6-4.3 2.8 0 5.3 1.4 6.6 4.3" stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {openMenu === 'profile' && (
                  <div role="menu" style={{ ...smallDrop, right: 0, left: 'auto', width: 220 }}>
                    <div style={{ padding: '4px 8px 6px' }}>
                      {ACCOUNT_LINKS.map(item => (
                        <a key={item.label} href={item.href} role="menuitem"
                          onClick={() => setOpenMenu(null)}
                          style={{ display: 'block', padding: '10px 12px', fontSize: 13, color: '#1a1a18', borderRadius: 8, textDecoration: 'none' }}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid #efefed', padding: '8px 8px 4px' }}>
                      <button type="button"
                        onClick={async () => { await signOut(); setOpenMenu(null) }}
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
                onMouseEnter={() => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m)}
                style={{ background: '#000', color: '#fff', padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 4 }}
              >
                Sign in
              </a>
            )}
          </div>
        </div>

        {/* ─── MEGA MENU PANEL ─── */}
        {isMegaOpen && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '100%',
            background: '#fff',
            borderTop: '1px solid #f0f0ee',
            borderBottom: '1px solid #f0f0ee',
            zIndex: 60,
            // slide-in animation
            animation: 'megaSlideIn 0.18s ease',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 28px 36px' }}>

              {/* SHOP panel */}
              {openMenu === 'shop' && (
                <div style={{ display: 'flex', gap: 64 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 16px' }}>Browse</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {SHOP_STATIC.map(item => (
                        <a key={item.href} href={item.href}
                          onClick={() => setOpenMenu(null)}
                          style={{ fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none', letterSpacing: '0.01em' }}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 16px' }}>Categories</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {categories.map(cat => (
                          <a key={cat} href={`/products?category=${encodeURIComponent(cat)}`}
                            onClick={() => setOpenMenu(null)}
                            style={{ fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none', letterSpacing: '0.01em' }}
                          >
                            {cat}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* INFO panel */}
              {openMenu === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {INFO_LINKS.map(item => (
                    <a key={item.href} href={item.href}
                      onClick={() => setOpenMenu(null)}
                      style={{ fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none', letterSpacing: '0.01em', width: 'fit-content' }}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}
      </nav>

      {/* Backdrop when mega menu is open */}
      {isMegaOpen && (
        <div
          onClick={() => setOpenMenu(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.15)',
            backdropFilter: 'blur(1px)',
            animation: 'fadeIn 0.18s ease',
          }}
        />
      )}
    </>
  )
}
