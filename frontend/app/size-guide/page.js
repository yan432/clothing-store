'use client'

import { useState } from 'react'

export const metadata = undefined // client component — metadata set via head

const SIZES = [
  { size: 'XS', eu: '32–34', us: 'XS / 0–2',  uk: '4–6',   chest: '80–84',  waist: '60–64',  hips: '86–90'  },
  { size: 'S',  eu: '36–38', us: 'S / 4–6',   uk: '8–10',  chest: '84–88',  waist: '64–68',  hips: '90–94'  },
  { size: 'M',  eu: '38–40', us: 'M / 8–10',  uk: '12–14', chest: '88–92',  waist: '68–72',  hips: '94–98'  },
  { size: 'L',  eu: '40–42', us: 'L / 12–14', uk: '16–18', chest: '92–96',  waist: '72–76',  hips: '98–102' },
  { size: 'XL', eu: '44–46', us: 'XL / 16',   uk: '20',    chest: '96–102', waist: '76–82',  hips: '102–108'},
]

// Simple size recommendation based on height + weight
function recommendSize(height, weight) {
  if (!height || !weight) return null
  const bmi = weight / ((height / 100) ** 2)
  // Adjust by height bands
  let base
  if (bmi < 18.5)                      base = 0  // XS
  else if (bmi < 21)                   base = 1  // S
  else if (bmi < 24)                   base = 2  // M
  else if (bmi < 27)                   base = 3  // L
  else                                 base = 4  // XL

  // Tall people often need a size up
  if (height >= 180 && base < 4) base += 0.5
  if (height >= 185 && base < 4) base += 0.5

  const idx = Math.min(4, Math.round(base))
  return SIZES[idx]
}

const thStyle = {
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#888',
  textAlign: 'left',
  borderBottom: '2px solid #eee',
  whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '12px 14px',
  fontSize: 14,
  color: '#333',
  borderBottom: '1px solid #f0f0ee',
}

export default function SizeGuidePage() {
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [result, setResult] = useState(null)

  function handleCalc(e) {
    e.preventDefault()
    const rec = recommendSize(Number(height), Number(weight))
    setResult(rec)
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Size Guide</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px', lineHeight: 1.6 }}>
        Our clothes run true to size. If you're between sizes, we recommend sizing up for a relaxed fit.
      </p>

      {/* ── How to measure ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>How to measure</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { icon: '📏', label: 'Chest', desc: 'Measure around the fullest part of your chest, keeping the tape horizontal.' },
            { icon: '〰️', label: 'Waist', desc: 'Measure around your natural waistline, the narrowest part of your torso.' },
            { icon: '🔄', label: 'Hips', desc: 'Measure around the fullest part of your hips, about 20 cm below your waist.' },
          ].map(({ icon, label, desc }) => (
            <div key={label} style={{ background: '#f7f7f5', borderRadius: 14, padding: '20px 18px' }}>
              <p style={{ fontSize: 28, margin: '0 0 10px' }}>{icon}</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Size table ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Size chart (cm)</h2>
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr style={{ background: '#fafaf8' }}>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>EU</th>
                <th style={thStyle}>US</th>
                <th style={thStyle}>UK</th>
                <th style={thStyle}>Chest</th>
                <th style={thStyle}>Waist</th>
                <th style={thStyle}>Hips</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((row, i) => (
                <tr key={row.size} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.size}</td>
                  <td style={tdStyle}>{row.eu}</td>
                  <td style={tdStyle}>{row.us}</td>
                  <td style={tdStyle}>{row.uk}</td>
                  <td style={tdStyle}>{row.chest} cm</td>
                  <td style={tdStyle}>{row.waist} cm</td>
                  <td style={tdStyle}>{row.hips} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#aaa', margin: '12px 0 0' }}>
          All measurements are body measurements, not garment measurements.
        </p>
      </section>

      {/* ── Size calculator ────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Find your size</h2>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
          Enter your measurements and we'll suggest the best fit. This is a general guide — individual body proportions vary.
        </p>

        <form onSubmit={handleCalc} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Height (cm)
            </span>
            <input
              type="number"
              min={140} max={220}
              placeholder="e.g. 175"
              value={height}
              onChange={e => { setHeight(e.target.value); setResult(null) }}
              required
              style={{
                border: '1px solid #ddd', borderRadius: 10,
                padding: '11px 14px', fontSize: 16,
                width: 130, outline: 'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Weight (kg)
            </span>
            <input
              type="number"
              min={40} max={200}
              placeholder="e.g. 70"
              value={weight}
              onChange={e => { setWeight(e.target.value); setResult(null) }}
              required
              style={{
                border: '1px solid #ddd', borderRadius: 10,
                padding: '11px 14px', fontSize: 16,
                width: 130, outline: 'none',
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 24px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              height: 46,
            }}
          >
            Find size
          </button>
        </form>

        {result && (
          <div style={{
            marginTop: 24,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Your size
              </p>
              <p style={{ fontSize: 40, fontWeight: 800, margin: 0, color: '#111' }}>{result.size}</p>
            </div>
            <div style={{ width: 1, height: 48, background: '#bbf7d0', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'EU', value: result.eu },
                { label: 'US', value: result.us },
                { label: 'Chest', value: result.chest + ' cm' },
                { label: 'Waist', value: result.waist + ' cm' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <p style={{ fontSize: 13, color: '#aaa', margin: '12px 0 0', lineHeight: 1.5 }}>
            Not sure? If you prefer a looser fit, size up. Have questions?{' '}
            <a href="/contact" style={{ color: '#333', textDecoration: 'underline' }}>Contact us</a> — we're happy to help.
          </p>
        )}
      </section>
    </main>
  )
}
