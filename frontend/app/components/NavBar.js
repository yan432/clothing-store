'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { usePartner } from '../lib/usePartner'
import { getApiUrl } from '../lib/api'
import { getMessages, localeFromPathname, pathForLocale, switchLocalePath, translateCategory } from '../lib/i18n'
import { collectionPathForCategory } from '../lib/collections'

const SHOP_ROUTES = [
  { key: 'allProducts', href: '/products' },
  { key: 'newArrivals', href: '/collections/new' },
  { key: 'sale',        href: '/collections/sale' },
]

const INFO_ROUTES = [
  { key: 'about',     href: '/about' },
  { key: 'contact',   href: '/contact' },
  { key: 'shipping',  href: '/shipping' },
  { key: 'returns',   href: '/returns' },
  { key: 'sizeGuide', href: '/size-guide' },
  { key: 'faq',       href: '/faq' },
]

const ACCOUNT_ROUTES = [
  { href: '/account',            key: 'myAccount' },
  { href: '/account?tab=orders', key: 'orders' },
  { href: '/wishlist',           key: 'wishlist' },
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
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const { count, setDrawerOpen } = useCart()
  const { user, signOut, isAdmin } = useAuth()
  const { ids: wishlistIds } = useWishlist()
  const { isPartner, brand } = usePartner(user)

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

  const shopStatic = SHOP_ROUTES.map(item => ({
    label: d.nav[item.key],
    href: pathForLocale(item.href, locale),
  }))
  const infoLinks = INFO_ROUTES.map(item => ({
    label: d.nav[item.key],
    href: pathForLocale(item.href, locale),
  }))
  const accountLinks = ACCOUNT_ROUTES.map(item => ({
    label: d.nav[item.key],
    href: pathForLocale(item.href, locale),
  }))
  const categoryHref = (category) => pathForLocale(
    collectionPathForCategory(category) || `/products?category=${encodeURIComponent(category)}`,
    locale,
  )

  function rememberPreferredLocale(nextLocale) {
    try {
      localStorage.setItem('preferred_locale', nextLocale)
    } catch (_) {}
    if (!user?.email) return
    fetch('/api/user-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_locale: nextLocale }),
    }).catch(() => {})
  }

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
          fontSize: 12, fontWeight: 900, letterSpacing: '0.08em',
          color: '#0a0a0a', padding: '4px 0', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
          borderBottom: active ? '1px solid #0a0a0a' : '1px solid transparent',
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
    fontSize: 14, fontWeight: 800, color: '#0a0a0a',
    textDecoration: 'none', display: 'block', letterSpacing: '0.02em',
  }

  const adminDrop = {
    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
    background: '#fff', border: '1px solid #0a0a0a',
    borderRadius: 0, padding: '8px 0', minWidth: 200,
    boxShadow: 'none', zIndex: 70,
    animation: 'megaSlideIn 0.15s ease',
  }

  return (
    <>
      <nav
        onMouseEnter={onNavEnter}
        onMouseLeave={onNavLeave}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: '#fff',
          backdropFilter: 'blur(8px)',
          borderBottom: isMegaOpen ? '1px solid transparent' : '1px solid #0a0a0a',
        }}
      >
        {/* Main bar */}
        <div className="nav-main-bar" style={{ alignItems: 'center', height: 56, padding: '0 20px' }}>

          {/* Hamburger — mobile left, hidden on desktop */}
          <button type="button" className="nav-hamburger" onClick={() => setMobileOpen(true)} aria-label={d.nav.openMenu}>
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M0 1h18M0 7h18M0 13h18" stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Logo: desktop — left col; mobile — absolute center */}
          <a href={pathForLocale('/', locale)} className="nav-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, fontSize: 16, fontWeight: 900, letterSpacing: '0.08em', textDecoration: 'none', color: 'inherit', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            <Image
              src="/brand/edm-logo-mark.png"
              alt=""
              width={42}
              height={42}
              priority
              style={{ width: 42, height: 42, objectFit: 'contain', border: 'none', display: 'block' }}
            />
            <span className="nav-logo-text">edm.clothes</span>
          </a>

          {/* CENTER — desktop nav links only */}
          <div className="nav-center-links">
            <a href={pathForLocale('/collections/new', locale)}
              onMouseEnter={() => setOpenMenu(null)}
              style={{ color: '#0a0a0a', textDecoration: 'none', fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {d.nav.newArrivals}
            </a>
            {navBtn('shop', d.nav.shop)}
            {navBtn('info', d.nav.info)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <a href={switchLocalePath(pathname, 'en')}
                onClick={() => rememberPreferredLocale('en')}
                aria-current={locale === 'en' ? 'true' : undefined}
                style={{
                  fontSize: 11, fontWeight: 900, letterSpacing: '0.06em',
                  color: locale === 'en' ? '#111' : '#777',
                  textDecoration: 'none', padding: '4px 0',
                }}>
                EN
              </a>
              <span style={{ fontSize: 11, color: '#777' }}>/</span>
              <a href={switchLocalePath(pathname, 'uk')}
                onClick={() => rememberPreferredLocale('uk')}
                aria-current={locale === 'uk' ? 'true' : undefined}
                style={{
                  fontSize: 11, fontWeight: 900, letterSpacing: '0.06em',
                  color: locale === 'uk' ? '#111' : '#777',
                  textDecoration: 'none', padding: '4px 0',
                }}>
                UA
              </a>
            </div>
          </div>

          {/* RIGHT — icons */}
          <div className="nav-right-icons">

            {/* Partner cabinet — visible to invited brand users only.
                Admin also gets an Admin dropdown below; partners-only users
                see this single link. */}
            {isPartner && !isAdmin && (
              <a href={pathForLocale('/partner', locale)}
                style={{ fontSize: 11, fontWeight: 900, color: '#555', padding: '8px 4px', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', marginRight: 8 }}>
                {brand?.name ? `Partner · ${brand.name}` : 'Partner'}
              </a>
            )}

            {/* Admin — desktop only (mobile: in hamburger drawer) */}
            {isAdmin && (
              <div ref={adminRef} className="nav-admin-btn" style={{ position: 'relative', marginRight: 8 }}
                onMouseEnter={() => { clearTimeout(navLeaveTimer.current); setOpenMenu('admin') }}
                onMouseLeave={onNavLeave}
              >
                <button type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, color: '#555', padding: '8px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Admin
                </button>
                {openMenu === 'admin' && (
                  <div role="menu" style={adminDrop}>
                    <div style={{ padding: '4px 8px 6px' }}>
                      {ADMIN_LINKS.map(item => (
                        <a key={item.label} href={item.href} role="menuitem"
                          onClick={() => setOpenMenu(null)}
                          style={{ display: 'block', padding: '10px 12px', fontSize: 12, color: '#0a0a0a', borderRadius: 0, textDecoration: 'none', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart */}
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label={d.nav.openCart}
              onMouseEnter={() => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m)}
              style={{ width: 36, height: 36, background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, cursor: 'pointer', padding: 0, color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {count > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, padding: '0 3px', borderRadius: 0, background: '#d7ff2f', color: '#0a0a0a', border: '1px solid #0a0a0a', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {count}
                </span>
              )}
            </button>

            {/* Wishlist icon — only for logged-in users */}
            {user && (
              <a href={pathForLocale('/wishlist', locale)} aria-label={d.nav.openWishlist}
                style={{ width: 36, height: 36, border: '1px solid #0a0a0a', borderRadius: 0, background: '#fff', display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
                <svg width="17" height="17" viewBox="0 0 24 24"
                  fill={wishlistIds.size > 0 ? '#111' : 'none'}
                  stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </a>
            )}

            {/* User icon */}
            <a href={pathForLocale(user ? '/account' : '/auth', locale)} aria-label={user ? d.nav.account : d.nav.signIn}
              onMouseEnter={() => setOpenMenu(m => (m === 'shop' || m === 'info') ? null : m)}
              style={{ width: 36, height: 36, border: '1px solid #0a0a0a', borderRadius: 0, background: '#fff', display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
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
            borderTop: '1px solid #0a0a0a',
            borderBottom: '1px solid #0a0a0a',
            zIndex: 60,
            animation: 'megaSlideIn 0.18s ease',
          }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 28px 36px', display: 'flex', gap: 80 }}>

              {/* SHOP */}
              {openMenu === 'shop' && (
                <>
                  <div>
                      <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 16px' }}>{d.nav.browse}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {shopStatic.map(item => (
                        <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={megaLink}>{item.label}</a>
                      ))}
                    </div>
                  </div>
                  {categories.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 16px' }}>{d.nav.categories}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {categories.map(cat => (
                          <a key={cat} href={categoryHref(cat)}
                            onClick={() => setOpenMenu(null)} style={megaLink}>{translateCategory(cat, locale)}</a>
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
                    <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 16px' }}>{d.nav.info}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {infoLinks.map(item => (
                        <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={megaLink}>{item.label}</a>
                      ))}
                    </div>
                  </div>

                  <div style={{ width: 1, background: '#0a0a0a', flexShrink: 0 }} />

                  <div>
                    <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 16px' }}>{d.nav.account}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {user ? (
                        <>
                          {accountLinks.map(item => (
                            <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={megaLink}>{item.label}</a>
                          ))}
                          <button type="button"
                            onClick={async () => { await signOut(); setOpenMenu(null) }}
                            style={{ ...megaLink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: '#aaa', fontSize: 15, fontWeight: 500 }}>
                            {d.nav.logOut}
                          </button>
                        </>
                      ) : (
                        <>
                          <a href={pathForLocale('/auth', locale)} onClick={() => setOpenMenu(null)} style={megaLink}>{d.nav.signIn}</a>
                          <a href={pathForLocale('/auth?tab=register', locale)} onClick={() => setOpenMenu(null)} style={megaLink}>{d.nav.createAccount}</a>
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
            width: 'min(320px, 86vw)', background: '#fff', overflowY: 'auto',
            borderRight: '1px solid #0a0a0a',
            animation: 'slideInLeft 0.25s ease',
          }}>
            {/* Drawer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #0a0a0a' }}>
              <a href={pathForLocale('/', locale)} onClick={() => setMobileOpen(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 900, letterSpacing: '0.08em', textDecoration: 'none', color: '#0a0a0a', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                <Image
                  src="/brand/edm-logo-mark.png"
                  alt=""
                  width={38}
                  height={38}
                  style={{ width: 38, height: 38, objectFit: 'contain', border: 'none', display: 'block' }}
                />
                edm.clothes
              </a>
              <button onClick={() => setMobileOpen(false)} style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, cursor: 'pointer', fontSize: 24, color: '#0a0a0a', width: 34, height: 34, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            {/* Drawer body */}
            <div style={{ padding: '20px' }}>
              {/* Partner cabinet — mobile only */}
              {isPartner && !isAdmin && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 4px' }}>Partner</p>
                  <div style={{ marginBottom: 24 }}>
                    <a href={pathForLocale('/partner', locale)} onClick={() => setMobileOpen(false)}
                      style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #0a0a0a', fontSize: 14, fontWeight: 900, color: '#555', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {brand?.name ? `${brand.name} cabinet` : 'Partner cabinet'}
                    </a>
                  </div>
                </>
              )}

              {/* Admin — mobile only */}
              {isAdmin && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 4px' }}>{d.nav.admin}</p>
                  <div style={{ marginBottom: 24 }}>
                    {ADMIN_LINKS.map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #0a0a0a', fontSize: 14, fontWeight: 900, color: '#555', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {item.label}
                      </a>
                    ))}
                  </div>
                </>
              )}
              {/* Shop */}
              <div style={{ display: 'flex', gap: 8, margin: '0 0 20px' }}>
                <a href={switchLocalePath(pathname, 'en')} onClick={() => { rememberPreferredLocale('en'); setMobileOpen(false) }}
                  style={{ fontSize: 12, fontWeight: 900, color: locale === 'en' ? '#111' : '#777', textDecoration: 'none' }}>EN</a>
                <span style={{ fontSize: 12, color: '#777' }}>/</span>
                <a href={switchLocalePath(pathname, 'uk')} onClick={() => { rememberPreferredLocale('uk'); setMobileOpen(false) }}
                  style={{ fontSize: 12, fontWeight: 900, color: locale === 'uk' ? '#111' : '#777', textDecoration: 'none' }}>UA</a>
              </div>

              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 4px' }}>{d.nav.shop}</p>
              <div style={{ marginBottom: 24 }}>
                {[...shopStatic, ...categories.map(cat => ({ label: translateCategory(cat, locale), href: categoryHref(cat) }))].map(item => (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #0a0a0a', fontSize: 14, fontWeight: 900, color: '#0a0a0a', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {item.label}
                  </a>
                ))}
              </div>
              {/* Account */}
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 4px' }}>{d.nav.account}</p>
              <div style={{ marginBottom: 24 }}>
                {user ? (
                  <>
                    {accountLinks.map(item => (
                      <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #0a0a0a', fontSize: 14, fontWeight: 900, color: '#0a0a0a', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {item.label}
                      </a>
                    ))}
                    <button type="button" onClick={async () => { await signOut(); setMobileOpen(false) }}
                      style={{ display: 'block', width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 900, color: '#777', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #0a0a0a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {d.nav.logOut}
                    </button>
                  </>
                ) : (
                  <>
                    <a href={pathForLocale('/auth', locale)} onClick={() => setMobileOpen(false)}
                      style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #0a0a0a', fontSize: 14, fontWeight: 900, color: '#0a0a0a', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {d.nav.signIn}
                    </a>
                    <a href={pathForLocale('/auth?tab=register', locale)} onClick={() => setMobileOpen(false)}
                      style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #0a0a0a', fontSize: 14, fontWeight: 900, color: '#0a0a0a', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {d.nav.createAccount}
                    </a>
                  </>
                )}
              </div>
              {/* Info */}
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', margin: '0 0 4px' }}>{d.nav.info}</p>
              <div style={{ paddingBottom: 48 }}>
                {infoLinks.map(item => (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #0a0a0a', fontSize: 14, fontWeight: 900, color: '#0a0a0a', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
