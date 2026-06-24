'use client'

import { useState } from 'react'
import { Ruler, AlignCenter, RotateCcw } from 'lucide-react'

// Our unisex/male size chart
const OUR_SIZES = [
  { size: 'XS', eu_m: '44',    eu_w: '32–34', chest: '84–88',   waist: '68–72', height: '150–160 cm' },
  { size: 'S',  eu_m: '46',    eu_w: '36–38', chest: '88–94',   waist: '72–78', height: '160–170 cm' },
  { size: 'M',  eu_m: '48–50', eu_w: '40–42', chest: '94–100',  waist: '78–84', height: '170–180 cm' },
  { size: 'L',  eu_m: '52',    eu_w: '44–46', chest: '100–108', waist: '84–90', height: '180–190 cm' },
  { size: 'XL', eu_m: '54–56', eu_w: '48–50', chest: '108–116', waist: '90–96', height: '190+ cm'    },
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
  else if (chest < 94)   return 1 // S
  else if (chest < 100)  return 2 // M
  else if (chest < 108)  return 3 // L
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
  borderBottom: '2px solid #0a0a0a', whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '12px 14px', fontSize: 14,
  color: '#333', borderBottom: '1px solid #0a0a0a',
}
const inputStyle = {
  border: '1px solid #0a0a0a', borderRadius: 0,
  padding: '11px 14px', fontSize: 16, outline: 'none',
  height: 46, boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: '#555',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
}

const SIZE_COPY = {
  en: {
    title: 'Size Guide',
    leadPrefix: 'Our clothes are cut in a',
    leadStrong: 'unisex / menswear',
    leadSuffix: "fit. If you usually shop women's sizes, we recommend going 1-2 sizes down.",
    measureTitle: 'How to measure',
    measures: [
      { Icon: Ruler, label: 'Chest', desc: 'Measure around the fullest part of your chest, keeping the tape horizontal under your arms.' },
      { Icon: AlignCenter, label: 'Waist', desc: 'Measure around your natural waistline, the narrowest part of your torso.' },
      { Icon: RotateCcw, label: 'Hips', desc: 'Measure around the fullest part of your hips, about 20 cm below your waist.' },
    ],
    chartTitle: 'Size chart (cm)',
    chartLead: 'All measurements are body measurements, not garment measurements.',
    headers: ['Size', 'EU Men', 'EU Women', 'Chest, cm', 'Waist, cm', 'Recommended height'],
    tipTitle: "Women's sizing tip:",
    tipText: 'Women usually size down 1-2 sizes depending on the desired fit.',
    calculatorTitle: 'Find your size',
    calculatorLead: 'Enter your details for a personalised recommendation. Height and weight are required; the rest helps us fine-tune the result.',
    height: 'Height (cm) *',
    weight: 'Weight (kg) *',
    usuallyShop: 'I usually shop',
    optional: '- optional -',
    mensSizes: "Men's sizes",
    womensSizes: "Women's sizes",
    usualSize: 'My usual size',
    find: 'Find my size ->',
    recommend: 'We recommend',
    resultLabels: ['EU Men', 'EU Women', 'Chest', 'Waist', 'Height'],
    between: 'Between sizes? Size up for a relaxed fit, size down for a fitted look.',
    contact: 'Contact us',
    help: 'if you need help.',
  },
  uk: {
    title: 'Розмірна сітка',
    leadPrefix: 'Наші речі мають',
    leadStrong: 'унісекс / menswear',
    leadSuffix: 'посадку. Якщо ти зазвичай носиш жіночі розміри, радимо обирати на 1-2 розміри менше.',
    measureTitle: 'Як знімати мірки',
    measures: [
      { Icon: Ruler, label: 'Груди', desc: 'Вимірюй по найширшій частині грудей, тримаючи сантиметр горизонтально під руками.' },
      { Icon: AlignCenter, label: 'Талія', desc: 'Вимірюй по природній лінії талії, у найвужчій частині тулуба.' },
      { Icon: RotateCcw, label: 'Стегна', desc: 'Вимірюй по найширшій частині стегон, приблизно на 20 см нижче талії.' },
    ],
    chartTitle: 'Розмірна сітка (см)',
    chartLead: 'У таблиці вказані мірки тіла, а не готового виробу.',
    headers: ['Розмір', 'EU чоловічий', 'EU жіночий', 'Груди, см', 'Талія, см', 'Рекомендований зріст'],
    tipTitle: 'Порада для жіночих розмірів:',
    tipText: 'Зазвичай варто обирати на 1-2 розміри менше, залежно від бажаної посадки.',
    calculatorTitle: 'Знайти свій розмір',
    calculatorLead: 'Введи параметри для персональної рекомендації. Зріст і вага обов’язкові, решта допомагає точніше підібрати розмір.',
    height: 'Зріст (см) *',
    weight: 'Вага (кг) *',
    usuallyShop: 'Зазвичай ношу',
    optional: '- необов’язково -',
    mensSizes: 'Чоловічі розміри',
    womensSizes: 'Жіночі розміри',
    usualSize: 'Мій звичний розмір',
    find: 'Знайти розмір ->',
    recommend: 'Рекомендуємо',
    resultLabels: ['EU чоловічий', 'EU жіночий', 'Груди', 'Талія', 'Зріст'],
    between: 'Між двома розмірами? Обери більший для вільнішої посадки або менший для більш приталеного вигляду.',
    contact: 'Напиши нам',
    help: 'якщо потрібна допомога.',
  },
}

export default function SizeGuideClient({ locale = 'en' }) {
  const t = SIZE_COPY[locale === 'uk' ? 'uk' : 'en']
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
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t.title}</h1>
      <p style={{ fontSize: 15, color: '#888', margin: '0 0 48px', lineHeight: 1.6 }}>
        {t.leadPrefix} <strong style={{ color: '#555' }}>{t.leadStrong}</strong> {t.leadSuffix}
      </p>

      {/* ── How to measure ─────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>{t.measureTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {t.measures.map(({ Icon, label, desc }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #0a0a0a', borderRadius: 0, padding: '20px 18px' }}>
              <div style={{ marginBottom: 10 }}><Icon size={28} strokeWidth={1.5} /></div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Size table ─────────────────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>{t.chartTitle}</h2>
        <p style={{ fontSize: 13, color: '#999', margin: '0 0 16px' }}>{t.chartLead}</p>
        <div style={{ overflowX: 'auto', borderRadius: 0, border: '1px solid #0a0a0a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: '#fff' }}>
                {t.headers.map((header) => <th key={header} style={thStyle}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {OUR_SIZES.map((row, i) => (
                <tr key={row.size} style={{ background: '#fff' }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.size}</td>
                  <td style={tdStyle}>{row.eu_m}</td>
                  <td style={tdStyle}>{row.eu_w}</td>
                  <td style={tdStyle}>{row.chest}</td>
                  <td style={tdStyle}>{row.waist}</td>
                  <td style={tdStyle}>{row.height}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, padding: '14px 18px', background: '#fffbeb', borderRadius: 0, border: '1px solid #92400e' }}>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
            <strong>{t.tipTitle}</strong> {t.tipText}
          </p>
        </div>
      </section>

      {/* ── Size calculator ────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>{t.calculatorTitle}</h2>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
          {t.calculatorLead}
        </p>

        <form onSubmit={handleCalc}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            {/* Height */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>{t.height}</label>
              <input
                type="number" min={140} max={220} placeholder="e.g. 182" required
                value={height} onChange={e => { setHeight(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 130 }}
              />
            </div>
            {/* Weight */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>{t.weight}</label>
              <input
                type="number" min={40} max={200} placeholder="e.g. 78" required
                value={weight} onChange={e => { setWeight(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 130 }}
              />
            </div>
            {/* Gender */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>{t.usuallyShop}</label>
              <select
                value={gender} onChange={e => { setGender(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 160, background: '#fff', cursor: 'pointer' }}
              >
                <option value="">{t.optional}</option>
                <option value="man">{t.mensSizes}</option>
                <option value="woman">{t.womensSizes}</option>
              </select>
            </div>
            {/* Known size */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>{t.usualSize}</label>
              <select
                value={knownSize} onChange={e => { setKnownSize(e.target.value); setResult(null) }}
                style={{ ...inputStyle, width: 160, background: '#fff', cursor: 'pointer' }}
              >
                <option value="">{t.optional}</option>
                {WOMENS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            style={{
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 0, padding: '12px 28px',
              fontSize: 14, fontWeight: 800, cursor: 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            {t.find}
          </button>
        </form>

        {result && (
          <div style={{
            marginTop: 24,
            background: '#f0fdf4', border: '1px solid #16a34a',
            borderRadius: 0, padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            <div style={{ textAlign: 'center', minWidth: 60 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                {t.recommend}
              </p>
              <p style={{ fontSize: 44, fontWeight: 800, margin: 0, color: '#111', lineHeight: 1 }}>{result.size}</p>
            </div>
            <div style={{ width: 1, height: 56, background: '#16a34a', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: t.resultLabels[0], value: result.eu_m },
                { label: t.resultLabels[1], value: result.eu_w },
                { label: t.resultLabels[2], value: result.chest + ' cm' },
                { label: t.resultLabels[3], value: result.waist + ' cm' },
                { label: t.resultLabels[4], value: result.height },
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
            {t.between}{' '}
            <a href={locale === 'uk' ? '/ua/contact' : '/contact'} style={{ color: '#333', textDecoration: 'underline' }}>{t.contact}</a> {t.help}
          </p>
        )}
      </section>
    </main>
  )
}
