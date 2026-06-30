'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { tokens } from '../../admin/_components/tokens'

const groups = [
  {
    title: 'Storefront',
    items: [
      { href: '/', label: 'View site' },
    ],
  },
  {
    title: 'Overview',
    items: [
      { href: '/partner', label: 'Dashboard', match: 'exact' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/partner/orders', label: 'Orders' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/partner/products', label: 'My products' },
      { href: '/partner/inventory', label: 'Inventory' },
    ],
  },
]

function isActive(pathname, item) {
  if (item.match === 'exact') return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

export default function PartnerSidebar({ brand }) {
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
      <div style={{ padding: '0 10px 14px', borderBottom: `1px solid ${tokens.color.borderStrong}`, marginBottom: 14 }}>
        <div style={{ ...tokens.font.label, fontSize: 11, marginBottom: 6 }}>Brand</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {brand?.logo_url ? (
            <div style={{ width: 32, height: 32, borderRadius: 0, background: tokens.color.bg, border: `1px solid ${tokens.color.borderStrong}`, overflow: 'hidden', flexShrink: 0 }}>
              <img src={brand.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : null}
          <div style={{ fontSize: 13, fontWeight: 900, color: tokens.color.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{brand?.name || '—'}</div>
        </div>
      </div>

      {groups.map(group => (
        <div key={group.title} style={{ marginBottom: tokens.space.lg }}>
          <div style={{ ...tokens.font.label, padding: '8px 10px 4px' }}>{group.title}</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map(item => {
              const active = isActive(pathname, item)
              return (
                <Link key={item.href} href={item.href} className={active ? 'is-active' : undefined} style={{
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
                }}>
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
