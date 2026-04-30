'use client'

import { useState } from 'react'

// Our unisex/male size chart
const OUR_SIZES = [
  { size: 'XS', eu_m: '44',    eu_w: '32–34', us: 'XS',     uk_m: '34', chest: '84–88',  waist: '68–72',  hips: '86–90'  },
  { size: 'S',  eu_m: '46',    eu_w: '36–38', us: 'S',      uk_m: '36', chest: '88–92',  waist: '72–76',  hips: '90–94'  },
  { size: 'M',  eu_m: '48–50', eu_w: '40–42', us: 'M',      uk_m: '38', chest: '92–96',  waist: '76–80',  hips: '94–98'  },
  { size: 'L',  eu_m: '52',    eu_w: '44–46', us: 'L',      uk_m: '40', chest: '96–102', waist: '80–86',  hips: '98–104' },
  { size: 'XL', eu_m: '54–56', eu_w: '48–50', us: 'XL',    uk_m: '42', chest: '102–108','waist': '86–92', hips: '104–110'},
]

// Women's standard sizes for reference / mapping
const WOMENS_SIZES = ['XS', 'S', 'M', 'L', 'XL']

// Map women's declared size → our size index (our clothes run ~1 size larger than women's)
const WOMENS_TO_OURS = { XS: 0, S: 0, M: 1, L: 2, XL: 3 }
// Men's declared size → our size index (direct match)
const MENS_TO_OURS = { XS: 0, S: 1, M: 2, L: 3, XL: 4 }

function recommendByBody(height, weight, gender) {
  // Estimate chest circumference (rough anthropometric formula)
  // For men: chest ≈ height * 0.52 + weight * 0.18 (approximate)
  // For women: adjust upward since our cuts are wider
  let chest = height * 0.52 + weight * 0.18
  if (gender === 'woman') chest += 4 // women typically have wider hips/chest relative to waist

  if (chest < 88)        return 0 // XS
  else if (chest < 92)   return 1 // S
  else if (chest < 97)   return 2 // M
  else if (chest < 103)  return 3 // L
  else                   return 4 // XL
}

function recommend(height, weight, gender, knownSize) {
  const bodyIdx = recommendByBody(Number(height), Number(weight), gender)

  if (!knownSize) return bodyIdx

  // If they told us their usual size, reconcile with body measurement
  const declaredIdx = gender === 'woman'
    ? (WOMENS_TO_OURS[knownSize] ?? bodyIdx)
    : (MENS_TO_OURS[knownSize] ?? bodyIdx)

  // Average body estimate and declared size, lean toward body measurement
  return Math.round((bodyIdx * 2 + declaredIdx) / 3)
}

const thStyle = {
  padding: '10px 14px', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#888', textAlign: 'left',
  borderBottom: '2px solid #eee', whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '12px 14px', fontSize: 14,
  color: '#333', borderBottom: '1px solid #f0f0ee',
}
const inputStyle = {
  border: '1px solid #ddd', borderRadius: 10,
  padding: '11px 14px', fontSize: 16, outline: 'none',
  height: 46, boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: '#555',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
}

export default function SizeGuideClient() {
  const [height, setHeight]       = useState('')
  const [weight, setWeight]       = useState('')
  const [gender, setGender]       = useState('')        // 'man' | 'woman' | ''
  const [knownSize, setKnownSize] = useState('')        // XS/S/M/L/XL | ''
  const [result, setResult]       = useState(null)

  function handleCalc(e) {
    e.preventDefault()
    const idx = recommend(height, weight, gender, knownSize)
    setResult(OUR_SIZES[Math.min(4, Math.max(0, idx))])
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Size Guide</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px', lineHeight: 1.6 }}>
        Our clothes are cut in a <strong style={{ color: '#555' }}>unisex / menswear</strong> fit.
        If you usually shop women's sizes, we recommend going 1–2 sizes down.
      </p>

      {/* ── How to measure ─────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>How to measure</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { icon: '📏', label: 'Chest', desc: 'Measure around the fullest part of your chest, keeping the tape horizontal under your arms.' },
            { icon: '〰️', label: 'Waist', desc: 'Measure around your natural waistline — the narrowest part of your torso.' },
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

      {/* ── Size table ─────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Size chart (cm)</h2>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 16px' }}>All measurements are body measurements, not garment measurements.</p>
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #eee' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: '#fafaf8' }}>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>EU (men)</th>
                <th style={thStyle}>EU (women)</th>
                <th style={thStyle}>US</th>
                <th style={thStyle}>Chest</th>
                <th style={thStyle}>Waist</th>
                <th style={thStyle}>Hips</th>
              </tr>
            </thead>
            <tbody>
              {OUR_SIZES.map((row, i) => (
                <tr key={row.size} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.size}</td>
                  <td style={tdStyle}>{row.eu_m}</td>
                  <td style={tdStyle}>{row.eu_w}</td>
                  <td style={tdStyle}>{row.us}</td>
                  <td style={tdStyle}>{row.chest} cm</td>
                  <td style={tdStyle}>{row.waist} cm</td>
                  <td style={tdStyle}>{row.hips} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, padding: '14px 18px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
            👗 <strong>Women's sizing tip:</strong> Our clothes are cut for a unisex/menswear silhouette.
            A women's <strong>L</strong> typically fits our <strong>M</strong>, and a women's <strong>M</strong> fits our <strong>S</strong>.
            Use the calculator below for a personalised recommendation.
          </p>
        </div>
      </section>

      {/* ── Size calculator ────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Find your size</h2>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
          Enter your details for a personalised recommendation. Height and weight are required; the rest helps us fine-tune the result.
        </p>

        <form onSubmit={handleCalc}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            {/* Height */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Height (cm) *</label>
              <input
                type="number" min={140} max={220} placeholder="e.g. 182" required
                value={height} onChange={e => { setHeight(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 130 }}
              />
            </div>
            {/* Weight */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>Weight (kg) *</label>
              <input
                type="number" min={40} max={200} placeholder="e.g. 78" required
                value={weight} onChange={e => { setWeight(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 130 }}
              />
            </div>
            {/* Gender */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>I usually shop</label>
              <select
                value={gender} onChange={e => { setGender(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 160, background: '#fff', cursor: 'pointer' }}
              >
                <option value="">— optional —</option>
                <option value="man">Men's sizes</option>
                <option value="woman">Women's sizes</option>
              </select>
            </div>
            {/* Known size */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>My usual size</label>
              <select
                value={knownSize} onChange={e => { setKnownSize(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 160, background: '#fff', cursor: 'pointer' }}
              >
                <option value="">— optional —</option>
                {WOMENS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            style={{
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 28px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Find my size →
          </button>
        </form>

        {result && (
          <div style={{
            marginTop: 24,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 14, padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                We recommend
              </p>
              <p style={{ fontSize: 44, fontWeight: 800, margin: 0, color: '#111', lineHeight: 1 }}>{result.size}</p>
            </div>
            <div style={{ width: 1, height: 56, background: '#bbf7d0', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'EU (men)',   value: result.eu_m },
                { label: 'EU (women)', value: result.eu_w },
                { label: 'Chest',      value: result.chest + ' cm' },
                { label: 'Waist',      value: result.waist + ' cm' },
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
            Between sizes? Size up for a relaxed fit, size down for a fitted look.{' '}
            <a href="/contact" style={{ color: '#333', textDecoration: 'underline' }}>Contact us</a> if you need help.
          </p>
        )}
      </section>
    </main>
  )
}
