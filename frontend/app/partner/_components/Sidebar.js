'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { tokens } from '../../admin/_components/tokens'

const groups = [
  {
    title: 'Overview',
    items: [
      { href: '/partner', label: 'Dashboard', match: 'exact' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/partner/products', label: 'My products' },
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
    <aside style={{
      width: 220,
      flexShrink: 0,
      borderRight: `1px solid ${tokens.color.border}`,
      background: tokens.color.surface,
      padding: '24px 12px',
      minHeight: 'calc(100vh - 60px)',
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
    }}>
      <div style={{ padding: '0 10px 14px', borderBottom: `1px solid ${tokens.color.border}`, marginBottom: 14 }}>
        <div style={{ ...tokens.font.label, fontSize: 11, marginBottom: 6 }}>Brand</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {brand?.logo_url ? (
            <div style={{ width: 28, height: 28, borderRadius: 6, background: tokens.color.bg, overflow: 'hidden', flexShrink: 0 }}>
              <img src={brand.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : null}
          <div style={{ fontSize: 14, fontWeight: 600, color: tokens.color.text }}>{brand?.name || '—'}</div>
        </div>
      </div>

      {groups.map(group => (
        <div key={group.title} style={{ marginBottom: tokens.space.lg }}>
          <div style={{ ...tokens.font.label, padding: '8px 10px 4px' }}>{group.title}</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map(item => {
              const active = isActive(pathname, item)
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'block',
                  padding: '7px 10px',
                  borderRadius: tokens.radius.sm,
                  fontSize: 13,
                  color: active ? tokens.color.text : tokens.color.textMuted,
                  background: active ? tokens.color.bg : 'transparent',
                  fontWeight: active ? 600 : 500,
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
