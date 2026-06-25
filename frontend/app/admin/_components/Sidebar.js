'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { tokens } from './tokens'

const groups = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', match: 'exact' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/promos', label: 'Promo codes' },
      { href: '/admin/subscribers', label: 'Subscribers' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products' },
      { href: '/admin/brands', label: 'Brands' },
      { href: '/admin/inventory', label: 'Inventory' },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/homepage', label: 'Homepage' },
      { href: '/admin/landing-page', label: 'Landing page' },
      { href: '/admin/pages', label: 'Static pages' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { href: '/admin/settings', label: 'Settings' },
      { href: '/admin/shipping', label: 'Shipping rates' },
    ],
  },
  {
    title: 'External',
    items: [
      { href: 'https://mail.zoho.eu', label: 'Zoho Mail ↗', external: true },
    ],
  },
]

function isActive(pathname, item) {
  if (item.external) return false
  if (item.match === 'exact') return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

export default function Sidebar() {
  const pathname = usePathname() || ''

  return (
    <aside className="operations-sidebar" style={{
      width: 240,
      flexShrink: 0,
      borderRight: `1px solid ${tokens.color.borderStrong}`,
      background: tokens.color.surface,
      padding: '22px 14px',
      minHeight: 'calc(100vh - 60px)',
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
    }}>
      <div style={{
        ...tokens.font.label,
        padding: '0 10px 12px',
        color: tokens.color.text,
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 900,
      }}>
        EDM Admin
      </div>

      {groups.map((group) => (
        <div key={group.title} style={{ marginBottom: tokens.space.lg }}>
          <div style={{
            ...tokens.font.label,
            padding: '8px 10px 4px',
          }}>
            {group.title}
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map((item) => {
              const active = isActive(pathname, item)
              const linkStyle = {
                display: 'block',
                padding: '9px 10px',
                borderRadius: tokens.radius.sm,
                fontSize: 12,
                color: active ? tokens.color.accentText : tokens.color.textMuted,
                background: active ? tokens.color.accent : 'transparent',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'background 120ms ease',
              }
              if (item.external) {
                return (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={active ? 'is-active' : undefined} style={linkStyle}>
                    {item.label}
                  </a>
                )
              }
              return (
                <Link key={item.href} href={item.href} className={active ? 'is-active' : undefined} style={linkStyle}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
    </aside>
  )
}
