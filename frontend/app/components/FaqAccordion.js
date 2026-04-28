'use client'
import { useState } from 'react'

export default function FaqAccordion({ items = [] }) {
  const [open, setOpen] = useState(null)

  if (!items.length) return (
    <p style={{ color: '#aaa', fontSize: 14 }}>No FAQ items yet.</p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={i} style={{ borderBottom: '1px solid #ecece8' }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '18px 0', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 16,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111', lineHeight: 1.4 }}>
                {item.question}
              </span>
              <span style={{
                fontSize: 20, color: '#888', flexShrink: 0,
                transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 220ms ease',
                display: 'inline-block',
              }}>+</span>
            </button>
            <div style={{
              overflow: 'hidden',
              maxHeight: isOpen ? 600 : 0,
              transition: 'max-height 280ms ease',
            }}>
              <p style={{ fontSize: 14, color: '#5f5f58', lineHeight: 1.75, margin: '0 0 18px', paddingRight: 32 }}>
                {item.answer}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
