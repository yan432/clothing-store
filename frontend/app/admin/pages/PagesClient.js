'use client'
import { useEffect, useState } from 'react'
import { getApiUrl } from '../../lib/api'

// ── helpers ──────────────────────────────────────────────────────────────────
const btn = (label, onClick, opts = {}) => (
  <button onClick={onClick} style={{
    border: '1px solid #e5e5e0', borderRadius: 8, padding: '7px 14px',
    fontSize: 13, cursor: 'pointer', background: opts.danger ? '#fef2f2' : opts.primary ? '#0a0a0a' : '#fff',
    color: opts.danger ? '#dc2626' : opts.primary ? '#fff' : '#333',
    fontWeight: opts.primary ? 600 : 400,
    opacity: opts.disabled ? 0.5 : 1,
    pointerEvents: opts.disabled ? 'none' : 'auto',
    ...opts.style,
  }}>{label}</button>
)

const ta = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #e5e5e0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }

// ── FAQ Editor (HTML) ─────────────────────────────────────────────────────────
function FaqEditor() {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(getApiUrl('/faq/admin')).then(r => r.json()).then(d => { setHtml(d.html || ''); setLoading(false) })
  }, [])

  const save = async () => {
    setSaving(true); setSaved(false)
    await fetch(getApiUrl('/faq/admin'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html }) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p style={{ color: '#aaa', fontSize: 14 }}>Loading…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
          HTML content · <a href="/faq" target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>View page ↗</a>
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: '#15803d' }}>✓ Saved</span>}
          {btn(saving ? 'Saving…' : 'Save', save, { primary: true, disabled: saving })}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 10px', lineHeight: 1.6 }}>
        Use <code style={{ background: '#f3f3f0', padding: '1px 5px', borderRadius: 4 }}>&lt;details class="faq-item"&gt;&lt;summary&gt;Question&lt;/summary&gt;&lt;p&gt;Answer&lt;/p&gt;&lt;/details&gt;</code> for each item.
      </p>
      <textarea
        value={html}
        onChange={e => setHtml(e.target.value)}
        rows={22}
        placeholder={'<details class="faq-item">\n  <summary>Question here?</summary>\n  <p>Answer here.</p>\n</details>'}
        style={{ ...ta, fontFamily: 'monospace', fontSize: 13 }}
        spellCheck={false}
      />
    </div>
  )
}

// ── Page Section Editor (Shipping / Returns) ──────────────────────────────────
function PageEditor({ slug, title }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(getApiUrl(`/pages/${slug}`)).then(r => r.json()).then(d => { setSections(d?.sections || []); setLoading(false) })
  }, [slug])

  const update = (idx, field, val) => setSections(sections.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  const moveUp = (idx) => { if (idx === 0) return; const a = [...sections]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; setSections(a) }
  const moveDown = (idx) => { if (idx === sections.length - 1) return; const a = [...sections]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; setSections(a) }
  const remove = (idx) => setSections(sections.filter((_, i) => i !== idx))
  const add = () => setSections([...sections, { title: '', body: '' }])

  const save = async () => {
    setSaving(true); setSaved(false)
    await fetch(getApiUrl(`/pages/${slug}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections }) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p style={{ color: '#aaa', fontSize: 14 }}>Loading…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{sections.length} sections · <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>View page ↗</a></p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: '#15803d' }}>✓ Saved</span>}
          {btn('+ Add section', add)}
          {btn(saving ? 'Saving…' : 'Save all', save, { primary: true, disabled: saving })}
        </div>
      </div>

      {sections.map((s, idx) => (
        <div key={idx} style={{ border: '1px solid #e5e5e0', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#aaa', minWidth: 20 }}>#{idx + 1}</span>
            {btn('↑', () => moveUp(idx))}
            {btn('↓', () => moveDown(idx))}
            <div style={{ marginLeft: 'auto' }}>{btn('Delete', () => remove(idx), { danger: true })}</div>
          </div>
          <input
            value={s.title} onChange={e => update(idx, 'title', e.target.value)}
            placeholder="Section title"
            style={{ ...ta, resize: 'none', marginBottom: 8, fontWeight: 600 }}
          />
          <textarea
            value={s.body} onChange={e => update(idx, 'body', e.target.value)}
            placeholder="Section content"
            rows={4}
            style={ta}
          />
        </div>
      ))}

      {sections.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbb', fontSize: 14 }}>
          No sections yet. Click "Add section" to get started.
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'faq',      label: 'FAQ' },
  { id: 'shipping', label: 'Shipping Info' },
  { id: 'returns',  label: 'Returns & Exchanges' },
]

export default function PagesClient() {
  const [tab, setTab] = useState('faq')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Static Pages</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid #e5e5e0', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', padding: '10px 18px', fontSize: 14, cursor: 'pointer',
            fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#111' : '#888',
            borderBottom: tab === t.id ? '2px solid #111' : '2px solid transparent',
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'faq'      && <FaqEditor />}
      {tab === 'shipping' && <PageEditor slug="shipping" title="Shipping Info" />}
      {tab === 'returns'  && <PageEditor slug="returns"  title="Returns & Exchanges" />}
    </div>
  )
}
