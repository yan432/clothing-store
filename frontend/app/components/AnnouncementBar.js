'use client'
import { useEffect, useState } from 'react'
import { getApiUrl } from '../lib/api'

const DEFAULT_ITEMS = [
  'FREE SHIPPING ON ALL ORDERS OVER €120',
  'NEW DROP — SPRING COLLECTION',
  'MADE IN UKRAINE',
]

export default function AnnouncementBar() {
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    fetch(getApiUrl('/settings'))
      .then(r => r.ok ? r.json() : null)
      .then(s => {
        if (!s) return
        if (s.announcement_bar_enabled === 'false') { setEnabled(false); return }
        if (s.announcement_bar_items) {
          const parsed = s.announcement_bar_items
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
          if (parsed.length) setItems(parsed)
        }
      })
      .catch(() => {})
  }, [])

  if (!enabled) return null

  // Render 4 copies so the loop is seamless at any screen width
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
    }}>
      <div className="announcement-track">
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
