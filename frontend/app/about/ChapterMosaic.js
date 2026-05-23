'use client'
import { useState } from 'react'
import s from './ChapterMosaic.module.css'

export default function ChapterMosaic({ items, idleCaption = '' }) {
  const [expanded, setExpanded] = useState(null)

  function toggle(i) {
    setExpanded((prev) => (prev === i ? null : i))
  }

  return (
    <div className={s.wrap}>
      <div className={s.grid}>
        {items.map((item, i) => {
          const isExpanded = expanded === i
          const isOther = expanded != null && !isExpanded
          const cls = [
            s.tile,
            isExpanded ? s.expanded : '',
            isOther ? s.dimmed : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={cls}
              aria-label={item.caption || `Item ${i + 1}`}
              aria-expanded={isExpanded}
            >
              <img src={item.src} alt={item.caption || ''} loading="lazy" />
            </button>
          )
        })}
      </div>
      <div className={s.caption}>
        {expanded != null ? items[expanded].caption : idleCaption}
      </div>
    </div>
  )
}
