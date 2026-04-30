'use client'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { getApiUrl } from '../lib/api'

const SHOP_STATIC = [
  { label: 'All products', href: '/products' },
  { label: 'New arrivals', href: '/products?special=new' },
  { label: 'Sale',         href: '/products?special=sale' },
]

const INFO_LINKS = [
  { label: 'Contact us',          href: '/contact' },
  { label: 'Shipping info',       href: '/shipping' },
  { label: 'Returns & exchanges', href: '/returns' },
  { label: 'Size guide',          href: '/size-guide' },
  { label: 'FAQ',                 href: '/faq' },
]

const ACCOUNT_LINKS = [
  { href: '/account',                label: 'My account' },
  { href: '/account?tab=orders',     label: 'Orders' },
  { href: '/account?tab=wishlist',   label: 'Wishlist' },
  { href: '/account?tab=sizes',      label: 'Size guide' },
  { href: '/account?tab=faq',        label: 'Help & FAQ' },
]

const ADMIN_LINKS = [
  { href: '/admin/products',     label: 'Products CMS' },
  { href: '/admin/products/new', label: 'New Product' },
  { href: '/admin/orders',       label: 'Orders' },
  { href: '/admin/promos',       label: 'Promo Codes' },
  { href: '/admin/subscribers',  label: 'Subscribers' },
]

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Accessories', 'Knitwear', 'Denim', 'Jackets']

export default function NavBar() {
  const { count, setDrawerOpen } = useCart()
  const { user, signOut, isAdmin } = useAuth()
  const { ids: wishlistIds, setDrawerOpen: setWishlistDrawerOpen } = useWishlist()

  const [openMenu,   setOpenMenu]   = useState(null) // 'shop' | 'info' | 'admin'
  const [categories, setCategories] = useState([])
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLeaveTimer = useRef(null)
  const adminRef      = useRef(null)

  useEffect(() => {
    fetch(getApiUrl('/categories'))
      .then(r => r.ok ? r.json() : [])
      .then(cats => {
        const sorted = [...(Array.isArray(cats) ? cats : [])].sort((a, b) => {
          const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b)
          if (ai !== -1 && bi !== -1) return ai - bi
          if (ai !== -1) return -1
          if (bi !== -1) return 1
          return a.localeCompare(b)
        })
        setCategories(sorted)
      })
      .catch(() => {})
  }, [])

  useEffect(() => () => clearTimeout(navLeaveTimer.current), [])

  // click-outside for admin small dropdown
  useEffect(() => {
    if (openMenu !== 'admin') return
    const h = e => { if (!adminRef.current?.contains(e.target)) setOpenMenu(null) }
    const esc = e => { if (e.key === 'Escape') setOpenMenu(null) }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', esc) }
  }, [openMenu])

  function openMega(menu) {
    clearTimeout(navLeaveTimer.current)
    setOpenMenu(menu)
  }
  function onNavLeave() {
    navLeaveTimer.current = setTimeout(
      () => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m),
      150
    )
  }
  function onNavEnter() { clearTimeout(navLeaveTimer.current) }

  const isMegaOpen = openMenu === 'shop' || openMenu === 'info'

  function navBtn(key, label) {
    const active = openMenu === key
    return (
      <button type="button" onMouseEnter={() => openMega(key)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, letterSpacing: '0.05em',
          color: '#1a1a18', padding: '4px 0',
          display: 'flex', alignItems: 'center', gap: 4,
          borderBottom: active ? '1.5px solid #1a1a18' : '1.5px solid transparent',
        }}
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
          style={{ opacity: 0.4, marginTop: 1, transition: 'transform 0.2s', transform: active ? 'rotate(180deg)' : 'none' }}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    )
  }

  const megaLink = {
    fontSize: 15, fontWeight: 500, color: '#1a1a18',
    textDecoration: 'none', display: 'block',
  }

  const adminDrop = {
    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
    background: '#fff', border: '1px solid #e8e8e5',
    borderRadius: 12, padding: '8px 0', minWidth: 200,
    boxShadow: '0 14px 34px rgba(15,15,15,0.08)', zIndex: 70,
    animation: 'megaSlideIn 0.15s ease',
  }

  return (
    <>
      <nav
        onMouseEnter={onNavEnter}
        onMouseLeave={onNavLeave}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: isMegaOpen ? '1px solid transparent' : '1px solid #f0f0ee',
        }}
      >
        {/* Main bar */}
        <div className="nav-main-bar" style={{ alignItems: 'center', height: 58, padding: '0 20px' }}>

          {/* Hamburger — mobile left, hidden on desktop */}
          <button type="button" className="nav-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M0 1h18M0 7h18M0 13h18" stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Logo: desktop — left col; mobile — absolute center */}
          <a href="/" className="nav-logo" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none', color: 'inherit' }}>
            edm.clothes
          </a>

          {/* CENTER — desktop nav links only */}
          <div className="nav-center-links">
            <a href="/products?special=new"
              onMouseEnter={() => setOpenMenu(null)}
              style={{ color: '#1a1a18', textDecoration: 'none', fontSize: 13, fontWeight: 500, letterSpacing: '0.05em' }}>
              New arrivals
            </a>
            {navBtn('shop', 'Shop')}
            {navBtn('info', 'Info')}
          </div>

          {/* RIGHT — icons */}
          <div className="nav-right-icons">

            {/* Admin — desktop only (mobile: in hamburger drawer) */}
            {isAdmin && (
              <div ref={adminRef} className="nav-admin-btn" style={{ position: 'relative', marginRight: 8 }}
                onMouseEnter={() => { clearTimeout(navLeaveTimer.current); setOpenMenu('admin') }}
                onMouseLeave={onNavLeave}
              >
                <button type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#999', padding: '8px 4px', letterSpacing: '0.04em' }}>
                  Admin
                </button>
                {openMenu === 'admin' && (
                  <div role="menu" style={adminDrop}>
                    <div style={{ padding: '4px 8px 6px' }}>
                      {ADMIN_LINKS.map(item => (
                        <a key={item.label} href={item.href} role="menuitem"
                          onClick={() => setOpenMenu(null)}
                          style={{ display: 'block', padding: '10px 12px', fontSize: 13, color: '#1a1a18', borderRadius: 8, textDecoration: 'none' }}>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart */}
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open cart"
              onMouseEnter={() => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 9, color: '#1a1a18', display: 'flex', alignItems: 'center', position: 'relative' }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {count > 0 && (
                <span style={{ position: 'absolute', top: 5, right: 5, width: 15, height: 15, borderRadius: '50%', background: '#111', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {count}
                </span>
              )}
            </button>

            {/* Wishlist icon — only for logged-in users */}
            {user && (
              <button type="button" onClick={() => setWishlistDrawerOpen(true)} aria-label="Wishlist"
                style={{ width: 36, height: 36, border: '1px solid #d9d9d6', borderRadius: '50%', background: '#f4f4f1', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24"
                  fill={wishlistIds.size > 0 ? '#111' : 'none'}
                  stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            )}

            {/* User icon */}
            <a href={user ? '/account' : '/auth'} aria-label={user ? 'Account' : 'Sign in'}
              onMouseEnter={() => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m)}
              style={{ width: 36, height: 36, border: '1px solid #d9d9d6', borderRadius: '50%', background: '#f4f4f1', display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.1" stroke="#1a1a18" strokeWidth="1.5"/>
                <path d="M5.4 19.1c1.3-2.9 3.8-4.3 6.6-4.3 2.8 0 5.3 1.4 6.6 4.3" stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </a>

          </div>
        </div>

        {/* ── MEGA MENU PANEL ── */}
        {isMegaOpen && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '100%',
            background: '#fff',
            borderTop: '1px solid #f0f0ee',
            borderBottom: '1px solid #f0f0ee',
            zIndex: 60,
            animation: 'megaSlideIn 0.18s ease',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 28px 36px', display: 'flex', gap: 80 }}>

              {/* SHOP */}
              {openMenu === 'shop' && (
                <>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 16px' }}>Browse</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {SHOP_STATIC.map(item => (
                        <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={megaLink}>{item.label}</a>
                      ))}
                    </div>
                  </div>
                  {categories.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 16px' }}>Categories</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {categories.map(cat => (
                          <a key={cat} href={`/products?category=${encodeURIComponent(cat)}`}
                            onClick={() => setOpenMenu(null)} style={megaLink}>{cat}</a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* INFO */}
              {openMenu === 'info' && (
                <>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 16px' }}>Info</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {INFO_LINKS.map(item => (
                        <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={megaLink}>{item.label}</a>
                      ))}
                    </div>
                  </div>

                  <div style={{ width: 1, background: '#f0f0ee', flexShrink: 0 }} />

                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 16px' }}>Account</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {user ? (
                        <>
                          {ACCOUNT_LINKS.map(item => (
                            <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={megaLink}>{item.label}</a>
                          ))}
                          <button type="button"
                            onClick={async () => { await signOut(); setOpenMenu(null) }}
                            style={{ ...megaLink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: '#aaa', fontSize: 15, fontWeight: 500 }}>
                            Log out
                          </button>
                        </>
                      ) : (
                        <>
                          <a href="/auth" onClick={() => setOpenMenu(null)} style={megaLink}>Sign in</a>
                          <a href="/auth?tab=register" onClick={() => setOpenMenu(null)} style={megaLink}>Create account</a>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        )}
      </nav>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease' }} />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 201,
            width: 'min(300px, 85vw)', background: '#fff', overflowY: 'auto',
            animation: 'slideInLeft 0.25s ease',
          }}>
            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0ee' }}>
              <a href="/" onClick={() => setMobileOpen(false)} style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none', color: '#1a1a18' }}>
                edm.clothes
              </a>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 26, color: '#888', padding: '0 2px', lineHeight: 1 }}>×</button>
            </div>
            {/* Drawer body */}
            <div style={{ padding: '20px' }}>
              {/* Admin — mobile only */}
              {isAdmin && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
                  <div style={{ marginBottom: 24 }}>
                    {ADMIN_LINKS.map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f3', fontSize: 15, fontWeight: 500, color: '#888', textDecoration: 'none' }}>
                        {item.label}
                      </a>
                    ))}
                  </div>
                </>
              )}
              {/* Shop */}
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 4px' }}>Shop</p>
              <div style={{ marginBottom: 24 }}>
                {[...SHOP_STATIC, ...categories.map(cat => ({ label: cat, href: `/products?category=${encodeURIComponent(cat)}` }))].map(item => (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f3', fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none' }}>
                    {item.label}
                  </a>
                ))}
              </div>
              {/* Account */}
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '0 0 4px' }}>Account</p>
              <div>
                {user ? (
                  <>
                    {ACCOUNT_LINKS.map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f3', fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none' }}>
                        {item.label}
                      </a>
                    ))}
                    <button type="button" onClick={async () => { await signOut(); setMobileOpen(false) }}
                      style={{ display: 'block', width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 500, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f5f5f3' }}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <a href="/auth" onClick={() => setMobileOpen(false)}
                      style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f3', fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none' }}>
                      Sign in
                    </a>
                    <a href="/auth?tab=register" onClick={() => setMobileOpen(false)}
                      style={{ display: 'block', padding: '12px 0', fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none' }}>
                      Create account
                    </a>
                  </>
                )}
              </div>
              {/* Info */}
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#bbb', textTransform: 'uppercase', margin: '24px 0 4px' }}>Info</p>
              <div>
                {INFO_LINKS.map(item => (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f3', fontSize: 15, fontWeight: 500, color: '#1a1a18', textDecoration: 'none' }}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Backdrop */}
      {isMegaOpen && (
        <div onClick={() => setOpenMenu(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.12)', backdropFilter: 'blur(1px)', animation: 'fadeIn 0.18s ease' }}
        />
      )}
    </>
  )
}
