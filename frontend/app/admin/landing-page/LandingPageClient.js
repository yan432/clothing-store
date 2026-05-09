'use client'
import { useEffect, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import AdminTopBar from '../../components/AdminTopBar'
import { getAdminApiUrl } from '../../lib/api'
import { homepageContent } from '../../lib/homepageContent'

const DEFAULT_HERO = homepageContent.hero
const DEFAULT_TILES = homepageContent.promoTiles

function field(label, value, onChange, opts = {}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={opts.placeholder || ''}
        style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
      />
    </div>
  )
}

export default function LandingPageClient() {
  const [hero, setHero] = useState(DEFAULT_HERO)
  const [tiles, setTiles] = useState(DEFAULT_TILES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(getAdminApiUrl('/settings'), { cache: 'no-store' })
      .then(r => r.json())
      .then(raw => {
        const map = Array.isArray(raw)
          ? Object.fromEntries(raw.map(r => [r.key, r.value]))
          : (raw && typeof raw === 'object' ? raw : {})

        setHero({
          season:   map.landing_hero_season   || DEFAULT_HERO.season,
          title:    map.landing_hero_title    || DEFAULT_HERO.title,
          subtitle: map.landing_hero_subtitle || DEFAULT_HERO.subtitle,
          cta:      map.landing_hero_cta      || DEFAULT_HERO.cta,
          image:    map.landing_hero_image    || DEFAULT_HERO.image,
        })

        if (map.landing_promo_tiles) {
          try { setTiles(JSON.parse(map.landing_promo_tiles)) } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setHeroField(key, val) {
    setHero(h => ({ ...h, [key]: val }))
  }

  function setTileField(idx, key, val) {
    setTiles(prev => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t))
  }

  async function save() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch(getAdminApiUrl('/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_hero_season:   hero.season,
          landing_hero_title:    hero.title,
          landing_hero_subtitle: hero.subtitle,
          landing_hero_cta:      hero.cta,
          landing_hero_image:    hero.image,
          landing_promo_tiles:   JSON.stringify(tiles),
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setMessage('Saved!')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setError('Error saving. Try again.')
      setTimeout(() => setError(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminOnly>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <AdminTopBar active="landing-page" />

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 28px' }}>Landing Page</h1>

        {loading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Loading…</p>
        ) : (
          <>
            {/* ── HERO ── */}
            <section style={{ background: '#fafaf8', border: '1px solid #ececea', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>Hero секция</h2>
              {field('Сезон (мелкий текст вверху)', hero.season, v => setHeroField('season', v), { placeholder: 'Spring / Summer 2026' })}
              {field('Заголовок', hero.title, v => setHeroField('title', v), { placeholder: 'New Collection' })}
              {field('Подзаголовок', hero.subtitle, v => setHeroField('subtitle', v), { placeholder: 'Essential silhouettes for everyday city wear.' })}
              {field('Текст кнопки', hero.cta, v => setHeroField('cta', v), { placeholder: 'Shop now' })}
              {field('Фото (URL или /homepage-hero-main.jpg)', hero.image, v => setHeroField('image', v), { placeholder: '/homepage-hero-main.jpg' })}
            </section>

            {/* ── CATEGORY TILES ── */}
            <section style={{ background: '#fafaf8', border: '1px solid #ececea', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>Категории (Shop by category)</h2>
              {tiles.map((tile, idx) => (
                <div key={idx} style={{ borderBottom: idx < tiles.length - 1 ? '1px solid #e8e8e4' : 'none', paddingBottom: idx < tiles.length - 1 ? 16 : 0, marginBottom: idx < tiles.length - 1 ? 16 : 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    Тайл {idx + 1}
                  </p>
                  {field('Название', tile.title, v => setTileField(idx, 'title', v))}
                  {field('Фото (URL)', tile.image, v => setTileField(idx, 'image', v))}
                  {field('Ссылка (href)', tile.href, v => setTileField(idx, 'href', v))}
                </div>
              ))}
            </section>

            {/* ── MESSAGES ── */}
            {message && (
              <div style={{ background: '#ecfdf3', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#065f46', marginBottom: 16 }}>
                {message}
              </div>
            )}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              onClick={save}
              disabled={saving}
              style={{ background: saving ? '#555' : '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
      </div>
    </AdminOnly>
  )
}
