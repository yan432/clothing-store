'use client'

export default function SortSelect({ options, activeSort, hiddenFields }) {
  function handleChange(e) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(hiddenFields)) {
      if (Array.isArray(v)) v.forEach(val => sp.append(k, val))
      else if (v) sp.set(k, v)
    }
    if (e.target.value !== 'default') sp.set('sort', e.target.value)
    window.location.href = `/products${sp.toString() ? '?' + sp.toString() : ''}`
  }

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={activeSort}
        onChange={handleChange}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          padding: '7px 34px 7px 14px',
          borderRadius: 999, border: '1.5px solid #e0e0de',
          fontSize: 13, color: '#555', background: '#fff',
          cursor: 'pointer', outline: 'none',
        }}
      >
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none">
        <path d="M1 1L5 5L9 1" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
