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
  { label: 'Contact us',          href: 'mailto:info@edmclothes.com' },
  { label: 'Shipping info',       href: '/shipping' },
  { label: 'Returns & exchanges', href: '/returns' },
  { label: 'Size guide',          href: '/size-guide' },
  { label: 'FAQ',                 href: '/faq' },
]

const ACCOUNT_LINKS = [
  { href: '/account',             label: 'My account' },
  { href: '/account?tab=orders',  label: 'Orders' },
  { href: '/account?tab=returns', label: 'Returns' },
  { href: '/account?tab=sizes',   label: 'My sizes' },
  { href: '/account?tab=help',    label: 'Help & FAQ' },
]

const ADMIN_LINKS = [
  { href: '/admin/products',     label: 'Products CMS' },
  { href: '/admin/products/new', label: 'New Product' },
  { href: '/admin/orders',       label: 'Orders' },
  { href: '/admin/promos',       label: 'Promo Codes' },
  { href: '/admin/subscribers',  label: 'Subscribers' },
]

const CATEGORY_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Accessories', 'Knitwear', 'Denim', 'Jackets']

function sortCategories(cats) {
  return [...cats].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
}

export default function NavBar() {
  const { count, setDrawerOpen } = useCart()
  const { user, signOut, isAdmin } = useAuth()

  const [openMenu,   setOpenMenu]   = useState(null)
  const [categories, setCategories] = useState([])

  const timers = useRef({})

  useEffect(() => {
    fetch(getApiUrl('/categories'))
      .then(r => r.ok ? r.json() : [])
      .then(cats => setCategories(sortCategories(Array.isArray(cats) ? cats : [])))
      .catch(() => {})
  }, [])

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  function open(menu) {
    clearTimeout(timers.current[menu])
    setOpenMenu(menu)
  }
  function close(menu) {
    timers.current[menu] = setTimeout(() => setOpenMenu(m => m === menu ? null : m), 160)
  }
  function cancelClose(menu) {
    clearTimeout(timers.current[menu])
  }

  // Shared dropdown panel
  const drop = {
    position: 'absolute', top: 'calc(100% + 12px)', left: 0,
    background: '#fff', border: '1px solid #e8e8e5',
    borderRadius: 12, padding: '8px 0',
    boxShadow: '0 16px 40px rgba(15,15,15,0.1)',
    zIndex: 60, minWidth: 200,
    animation: 'megaSlideIn 0.15s ease',
  }

  const dropLink = {
    display: 'block', padding: '10px 18px',
    fontSize: 14, color: '#1a1a18',
    textDecoration: 'none', whiteSpace: 'nowrap',
  }

  const dropDivider = { height: 1, background: '#f0f0ee', margin: '6px 0' }

  // Nav button (center links with underline-on-active)
  function navBtn(key, label) {
    const active = openMenu === key
    return (
      <button type="button"
        onMouseEnter={() => open(key)}
        onMouseLeave={() => close(key)}
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

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #f0f0ee',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', height: 58, padding: '0 28px',
      }}>

        {/* LEFT — logo */}
        <a href="/" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none', color: 'inherit', justifySelf: 'start' }}>
          edm.clothes
        </a>

        {/* CENTER — nav links */}
        <div style={{ display: 'flex', gap: 36, fontSize: 13, fontWeight: 500, letterSpacing: '0.05em', alignItems: 'center' }}>

          <a href="/products?special=new"
            style={{ color: '#1a1a18', textDecoration: 'none', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, letterSpacing: '0.05em' }}>
            New arrivals
          </a>

          {/* SHOP dropdown */}
          <div style={{ position: 'relative' }}
            onMouseEnter={() => open('shop')}
            onMouseLeave={() => close('shop')}
          >
            {navBtn('shop', 'Shop')}
            {openMenu === 'shop' && (
              <div style={drop}
                onMouseEnter={() => cancelClose('shop')}
                onMouseLeave={() => close('shop')}
              >
                {SHOP_STATIC.map(item => (
                  <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={dropLink}>
                    {item.label}
                  </a>
                ))}
                {categories.length > 0 && (
                  <>
                    <div style={dropDivider} />
                    {categories.map(cat => (
                      <a key={cat} href={`/products?category=${encodeURIComponent(cat)}`}
                        onClick={() => setOpenMenu(null)} style={dropLink}>
                        {cat}
                      </a>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* INFO dropdown — info links + account links */}
          <div style={{ position: 'relative' }}
            onMouseEnter={() => open('info')}
            onMouseLeave={() => close('info')}
          >
            {navBtn('info', 'Info')}
            {openMenu === 'info' && (
              <div style={drop}
                onMouseEnter={() => cancelClose('info')}
                onMouseLeave={() => close('info')}
              >
                {INFO_LINKS.map(item => (
                  <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={dropLink}>
                    {item.label}
                  </a>
                ))}

                <div style={dropDivider} />

                {user ? (
                  <>
                    {ACCOUNT_LINKS.map(item => (
                      <a key={item.href} href={item.href} onClick={() => setOpenMenu(null)} style={dropLink}>
                        {item.label}
                      </a>
                    ))}
                    <div style={dropDivider} />
                    <button type="button"
                      onClick={async () => { await signOut(); setOpenMenu(null) }}
                      style={{ ...dropLink, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#888' }}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <a href="/auth" onClick={() => setOpenMenu(null)} style={dropLink}>Sign in</a>
                    <a href="/auth?tab=register" onClick={() => setOpenMenu(null)} style={dropLink}>Create account</a>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT — icons */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifySelf: 'end' }}>

          {/* Admin small dropdown */}
          {isAdmin && (
            <div style={{ position: 'relative', marginRight: 8 }}
              onMouseEnter={() => open('admin')}
              onMouseLeave={() => close('admin')}
            >
              <button type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#999', padding: '8px 4px', letterSpacing: '0.04em' }}>
                Admin
              </button>
              {openMenu === 'admin' && (
                <div style={{ ...drop, left: 'auto', right: 0 }}
                  onMouseEnter={() => cancelClose('admin')}
                  onMouseLeave={() => close('admin')}
                >
                  {ADMIN_LINKS.map(item => (
                    <a key={item.label} href={item.href} onClick={() => setOpenMenu(null)} style={dropLink}>
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open cart"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 9, color: '#1a1a18', display: 'flex', alignItems: 'center', position: 'relative' }}
          >
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

          {/* User icon — simple link, no dropdown */}
          <a href={user ? '/account' : '/auth'} aria-label={user ? 'Account' : 'Sign in'}
            style={{ width: 36, height: 36, border: '1px solid #d9d9d6', borderRadius: '50%', background: '#f4f4f1', display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.1" stroke="#1a1a18" strokeWidth="1.5"/>
              <path d="M5.4 19.1c1.3-2.9 3.8-4.3 6.6-4.3 2.8 0 5.3 1.4 6.6 4.3" stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </a>

        </div>
      </div>
    </nav>
  )
}
