'use client'

import { pathForLocale } from '../lib/i18n'

export default function SortSelect({ options, activeSort, hiddenFields, locale = 'en' }) {
  function handleChange(e) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(hiddenFields)) {
      if (Array.isArray(v)) v.forEach(val => sp.append(k, val))
      else if (v) sp.set(k, v)
    }
    if (e.target.value !== 'default') sp.set('sort', e.target.value)
    window.location.href = pathForLocale(`/products${sp.toString() ? '?' + sp.toString() : ''}`, locale)
  }

  return (
    <div className="products-sort-select" style={{ position: 'relative' }}>
      <select
        value={activeSort}
        onChange={handleChange}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          padding: '9px 34px 9px 14px',
          borderRadius: 0, border: '1px solid #0a0a0a',
          fontSize: 11, color: '#111', background: '#fff',
          fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer', outline: 'none',
        }}
      >
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none">
        <path d="M1 1L5 5L9 1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
