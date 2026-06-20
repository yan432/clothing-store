'use client'
import { useEffect, useRef, useState } from 'react'
import PageHeader from '../_components/PageHeader'
import { getAdminApiUrl } from '../../lib/api'
import { homepageContent } from '../../lib/homepageContent'

const DEFAULT_HERO = homepageContent.hero
const DEFAULT_TILES = homepageContent.promoTiles
const DEFAULT_OVERLAY = 72

function textField(label, value, onChange, placeholder) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
      />
    </div>
  )
}

async function compressImage(file, maxPx = 1920, maxBytes = 3.5 * 1024 * 1024) {
  if (file.size <= maxBytes) return file
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      let quality = 0.85
      const tryBlob = () => canvas.toBlob(blob => {
        if (!blob) { resolve(file); return }
        if (blob.size <= maxBytes || quality <= 0.35) {
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        } else { quality -= 0.1; tryBlob() }
      }, 'image/jpeg', quality)
      tryBlob()
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export default function LandingPageClient() {
  const [hero, setHero] = useState(DEFAULT_HERO)
  const [overlay, setOverlay] = useState(DEFAULT_OVERLAY)
  const [tiles, setTiles] = useState(DEFAULT_TILES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

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
        setOverlay(map.landing_hero_overlay != null ? Number(map.landing_hero_overlay) : DEFAULT_OVERLAY)
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

  async function handleImageUpload(e) {
    const raw = e.target.files?.[0]
    if (!raw) return
    setUploading(true)
    setError('')
    try {
      const file = await compressImage(raw)
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(getAdminApiUrl('/upload'), { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json()
      setHeroField('image', url)
      e.target.value = ''
    } catch (err) {
      setError(err.message || 'Upload failed')
      setTimeout(() => setError(''), 4000)
    } finally {
      setUploading(false)
    }
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
          landing_hero_overlay:  String(overlay),
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

  // Live preview gradient for the overlay slider
  const o = overlay / 100
  const previewGradient = hero.image
    ? `linear-gradient(to top, rgba(0,0,0,${(o * 0.72 / 0.72 * o).toFixed(2)}), rgba(0,0,0,${(o * 0.2 / 0.72).toFixed(2)}), rgba(0,0,0,${(o * 0.3 / 0.72).toFixed(2)})), url(${hero.image})`
    : null

  return (
    <>
      <PageHeader title="Landing page" subtitle="Hero, overlay and promo tiles for the public landing." />
      <div style={{ maxWidth: 700 }}>
        {loading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Loading…</p>
        ) : (
          <>
            {/* ── HERO ── */}
            <section style={{ background: '#fafaf8', border: '1px solid #ececea', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>Hero секция</h2>

              {/* Image upload */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 8 }}>Фото</label>

                {/* Preview + overlay demo */}
                {hero.image && (
                  <div style={{
                    position: 'relative', height: 160, borderRadius: 10, overflow: 'hidden',
                    marginBottom: 10, background: '#111',
                    backgroundImage: `linear-gradient(to top, rgba(0,0,0,${o.toFixed(2)}), rgba(0,0,0,${(o*0.28).toFixed(2)}), rgba(0,0,0,${(o*0.42).toFixed(2)})), url(${hero.image})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  }}>
                    <span style={{ position: 'absolute', bottom: 10, left: 12, color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Preview затемнения
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      border: '1.5px dashed #bbb', borderRadius: 8, padding: '9px 18px',
                      fontSize: 13, fontWeight: 600, cursor: uploading ? 'default' : 'pointer',
                      background: '#fff', color: '#444', opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    {uploading ? 'Uploading…' : '↑ Upload photo'}
                  </button>
                  {hero.image && (
                    <span style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                      {hero.image.split('/').pop()}
                    </span>
                  )}
                </div>
              </div>

              {/* Overlay slider */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 8 }}>
                  Затемнение фото — {overlay}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={overlay}
                  onChange={e => setOverlay(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#111' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  <span>Светло</span>
                  <span>Темно</span>
                </div>
              </div>

              {textField('Сезон (мелкий текст вверху)', hero.season, v => setHeroField('season', v), 'Spring / Summer 2026')}
              {textField('Заголовок', hero.title, v => setHeroField('title', v), 'New Collection')}
              {textField('Подзаголовок', hero.subtitle, v => setHeroField('subtitle', v), 'Essential silhouettes for everyday city wear.')}
              {textField('Текст кнопки', hero.cta, v => setHeroField('cta', v), 'Shop now')}
            </section>

            {/* ── CATEGORY TILES ── */}
            <section style={{ background: '#fafaf8', border: '1px solid #ececea', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px' }}>Категории (Shop by category)</h2>
              {tiles.map((tile, idx) => (
                <div key={idx} style={{ borderBottom: idx < tiles.length - 1 ? '1px solid #e8e8e4' : 'none', paddingBottom: idx < tiles.length - 1 ? 16 : 0, marginBottom: idx < tiles.length - 1 ? 16 : 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    Тайл {idx + 1}
                  </p>
                  {textField('Название', tile.title, v => setTileField(idx, 'title', v))}
                  {textField('Фото (URL)', tile.image, v => setTileField(idx, 'image', v))}
                  {textField('Ссылка (href)', tile.href, v => setTileField(idx, 'href', v))}
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
    </>
  )
}
