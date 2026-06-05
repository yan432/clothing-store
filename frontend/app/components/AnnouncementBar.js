'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getApiUrl } from '../lib/api'
import { getMessages, localeFromPathname } from '../lib/i18n'

function sameItems(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  return a.every((item, index) => item === b[index])
}

export default function AnnouncementBar() {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const [remote, setRemote] = useState({ locale: null, items: null, enabled: true })
  const [ready, setReady] = useState(false)
  const enabled = remote.locale === locale ? remote.enabled : true
  const items = remote.locale === locale && remote.items ? remote.items : d.announcement.items

  useEffect(() => {
    let cancelled = false
    requestAnimationFrame(() => {
      if (!cancelled) setReady(false)
    })

    const startWhenStable = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true)
        })
      })
    }

    fetch(getApiUrl('/settings'))
      .then(r => r.ok ? r.json() : null)
      .then(s => {
        if (cancelled) return
        if (!s) return
        if (s.announcement_bar_enabled === 'false') {
          setRemote({ locale, items: null, enabled: false })
          return
        }
        const rawItems = locale === 'uk'
          ? s.announcement_bar_items_uk
          : s.announcement_bar_items
        if (rawItems) {
          const parsed = rawItems
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
          if (parsed.length && !sameItems(parsed, d.announcement.items)) {
            setRemote({ locale, items: parsed, enabled: true })
          }
        }
      })
      .catch(() => {})
      .finally(startWhenStable)

    return () => {
      cancelled = true
    }
  }, [locale, d.announcement.items])

  if (!enabled) return null

  // Use 4 copies so the loop is seamless at any screen width
  const copies = [0, 1, 2, 3]

  return (
    <div style={{
      background: '#0a0a0a',
      color: '#fff',
      height: 36,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      userSelect: 'none',
      transform: 'translateZ(0)',
      isolation: 'isolate',
    }}>
      <div
        className="announcement-track"
        style={{ animationPlayState: ready ? 'running' : 'paused' }}
      >
        {copies.map(c =>
          items.map((item, i) => (
            <span key={`${c}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {item}
              <span style={{ margin: '0 28px', opacity: 0.35 }}>✦</span>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
