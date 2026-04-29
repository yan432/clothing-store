'use client'
import { useEffect, useState } from 'react'
import AdminOnly from '../../components/AdminOnly'
import AdminTopBar from '../../components/AdminTopBar'
import { getAdminApiUrl } from '../../lib/api'

// ── helpers ──────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ border: '1px solid #e8e8e4', borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>{title}</h3>
      {children}
    </div>
  )
}
function Input({ label, value, onChange, type = 'number', step = '0.001', min = '0', hint }) {
  return (
    <label style={{ fontSize: 13, color: '#444', display: 'block' }}>
      {label}
      <input
        type={type}
        step={step}
        min={min}
        value={value ?? ''}
        onChange={onChange}
        style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
      />
      {hint && <span style={{ fontSize: 11, color: '#aaa' }}>{hint}</span>}
    </label>
  )
}

const ZONE_COLORS = { 1:'#dbeafe',2:'#d1fae5',3:'#fef3c7',4:'#ede9fe',5:'#fce7f3',6:'#ffedd5',7:'#f1f5f9' }

// ── main component ────────────────────────────────────────────────────────────
export default function ShippingSettingsClient() {
  const [cfg, setCfg]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')
  const [activeZone, setActiveZone] = useState('1')

  useEffect(() => {
    fetch(getAdminApiUrl('/shipping/config'))
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(d => { setCfg(d); setLoading(false) })
      .catch(() => { setErr('Failed to load config'); setLoading(false) })
  }, [])

  async function save() {
    setSaving(true); setMsg(''); setErr('')
    try {
      const res = await fetch(getAdminApiUrl('/shipping/config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!res.ok) throw new Error(await res.text())
      setMsg('Saved!')
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  function setRate(v)   { setCfg(c => ({...c, uah_eur_rate: Number(v)})) }

  function setUkrBracket(i, field, v) {
    setCfg(c => {
      const bk = [...(c.ukraine?.brackets || [])]
      bk[i] = {...bk[i], [field]: field === 'label' ? v : Number(v)}
      return {...c, ukraine: {...c.ukraine, brackets: bk}}
    })
  }

  function setZoneBracket(zoneKey, i, field, v) {
    setCfg(c => {
      const zones = {...(c.europe_zones || {})}
      const z = {...zones[zoneKey]}
      const bk = [...(z.brackets || [])]
      bk[i] = {...bk[i], [field]: Number(v)}
      z.brackets = bk
      zones[zoneKey] = z
      return {...c, europe_zones: zones}
    })
  }
  function setZonePerKg(zoneKey, v) {
    setCfg(c => {
      const zones = {...(c.europe_zones || {})}
      zones[zoneKey] = {...zones[zoneKey], per_extra_kg_uah: Number(v)}
      return {...c, europe_zones: zones}
    })
  }
  function setZoneName(zoneKey, v) {
    setCfg(c => {
      const zones = {...(c.europe_zones || {})}
      zones[zoneKey] = {...zones[zoneKey], name: v}
      return {...c, europe_zones: zones}
    })
  }

  if (loading) return <AdminOnly><AdminTopBar active="shipping" /><div style={{padding:40,textAlign:'center',color:'#aaa'}}>Loading…</div></AdminOnly>

  const zones = cfg?.europe_zones || {}
  const zoneKeys = Object.keys(zones).sort((a,b) => Number(a)-Number(b))

  return (
    <AdminOnly>
      <AdminTopBar active="shipping" />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Shipping Settings</h1>
          <button
            onClick={save}
            disabled={saving}
            style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
        {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#166534', marginBottom: 16 }}>{msg}</div>}
        {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{err}</div>}

        {/* Exchange rate */}
        <Section title="Exchange rate">
          <div style={{ maxWidth: 220 }}>
            <Input
              label="1 UAH → EUR"
              value={cfg?.uah_eur_rate ?? 0.023}
              step="0.0001"
              onChange={e => setRate(e.target.value)}
              hint="Example: 0.023 means 1 UAH = 0.023 EUR (≈ 43 UAH/€)"
            />
          </div>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
            Current: 1 EUR ≈ {cfg?.uah_eur_rate ? (1/cfg.uah_eur_rate).toFixed(0) : '—'} UAH
          </p>
        </Section>

        {/* Ukraine domestic */}
        <Section title="Ukraine domestic (Nova Poshta)">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f5f3' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Label</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Max weight (kg)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Price (UAH)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>≈ EUR</th>
              </tr>
            </thead>
            <tbody>
              {(cfg?.ukraine?.brackets || []).map((b, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f0f0ee' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      type="text"
                      value={b.label || ''}
                      onChange={e => setUkrBracket(i, 'label', e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      type="number" step="0.1" min="0"
                      value={b.max_kg}
                      onChange={e => setUkrBracket(i, 'max_kg', e.target.value)}
                      style={{ width: 90, padding: '6px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      type="number" step="1" min="0"
                      value={b.price_uah}
                      onChange={e => setUkrBracket(i, 'price_uah', e.target.value)}
                      style={{ width: 100, padding: '6px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', color: '#666' }}>
                    €{((b.price_uah || 0) * (cfg?.uah_eur_rate || 0.023)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Europe zones */}
        <Section title="Europe — Nova Poshta international zones">
          {/* Zone tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {zoneKeys.map(k => (
              <button
                key={k}
                onClick={() => setActiveZone(k)}
                style={{
                  padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: activeZone === k ? '2px solid #000' : '1.5px solid #ddd',
                  background: activeZone === k ? '#000' : ZONE_COLORS[k] || '#f5f5f3',
                  color: activeZone === k ? '#fff' : '#333',
                }}
              >
                Zone {k}
              </button>
            ))}
          </div>

          {zoneKeys.map(k => k !== activeZone ? null : (
            <div key={k}>
              <input
                type="text"
                value={zones[k]?.name || ''}
                onChange={e => setZoneName(k, e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 10, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
                placeholder="Zone name"
              />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: ZONE_COLORS[k] || '#f5f5f3' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Max weight (kg)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Price (UAH)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>≈ EUR</th>
                  </tr>
                </thead>
                <tbody>
                  {(zones[k]?.brackets || []).map((b, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f0f0ee' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number" step="0.05" min="0"
                          value={b.max_kg}
                          onChange={e => setZoneBracket(k, i, 'max_kg', e.target.value)}
                          style={{ width: 90, padding: '6px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number" step="1" min="0"
                          value={b.price_uah}
                          onChange={e => setZoneBracket(k, i, 'price_uah', e.target.value)}
                          style={{ width: 110, padding: '6px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', color: '#666' }}>
                        €{((b.price_uah || 0) * (cfg?.uah_eur_rate || 0.023)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 13, color: '#444' }}>
                  Per extra kg (UAH, after 1 kg):
                  <input
                    type="number" step="1" min="0"
                    value={zones[k]?.per_extra_kg_uah ?? 0}
                    onChange={e => setZonePerKg(k, e.target.value)}
                    style={{ marginLeft: 8, width: 100, padding: '6px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                  />
                </label>
                <span style={{ fontSize: 12, color: '#aaa' }}>
                  ≈ €{((zones[k]?.per_extra_kg_uah || 0) * (cfg?.uah_eur_rate || 0.023)).toFixed(2)}/kg
                </span>
              </div>
            </div>
          ))}

          {/* Country → zone map */}
          <details style={{ marginTop: 20 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}>
              Country → zone mapping (click to expand)
            </summary>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12 }}>
              {Object.entries(cfg?.europe_country_zones || {}).sort((a,b) => a[1]-b[1]).map(([code, zone]) => (
                <span
                  key={code}
                  style={{ padding: '3px 10px', borderRadius: 999, background: ZONE_COLORS[zone] || '#eee', fontWeight: 500 }}
                >
                  {code} → Z{zone}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
              To change country zones, edit the shipping config JSON directly in the database (settings table, key: shipping_config).
            </p>
          </details>
        </Section>

        {/* Ukr Poshta */}
        <Section title="Ukr Poshta — World countries (not in Nova Poshta zones)">
          <p style={{ fontSize: 12, color: '#777', marginTop: 0, marginBottom: 12 }}>
            Pricing: flat rate for ≤250 g, then +per_kg_usd per started 1 kg over 250 g. Converted to EUR via USD rate.
          </p>
          <div style={{ maxWidth: 220, marginBottom: 16 }}>
            <Input
              label="USD → EUR rate"
              value={cfg?.ukrposhta?.usd_eur_rate ?? 0.92}
              step="0.01"
              onChange={e => setCfg(c => ({...c, ukrposhta: {...(c.ukrposhta||{}), usd_eur_rate: Number(e.target.value)}}))}
              hint="e.g. 0.92 means 1 USD = 0.92 EUR"
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f5f3' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Country (ISO)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>≤250 g (USD)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Per kg (USD)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>≈ EUR / ≤250g</th>
                <th style={{ padding: '8px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {Object.entries(cfg?.ukrposhta?.countries || {}).map(([code, rates]) => (
                <tr key={code} style={{ borderTop: '1px solid #f0f0ee' }}>
                  <td style={{ padding: '6px 12px', fontWeight: 600 }}>{code}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="number" step="0.5" min="0"
                      value={rates.base_usd ?? ''}
                      onChange={e => setCfg(c => ({...c, ukrposhta: {...(c.ukrposhta||{}), countries: {...(c.ukrposhta?.countries||{}), [code]: {...rates, base_usd: Number(e.target.value)}}}}))}
                      style={{ width: 80, padding: '5px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="number" step="0.5" min="0"
                      value={rates.per_kg_usd ?? ''}
                      onChange={e => setCfg(c => ({...c, ukrposhta: {...(c.ukrposhta||{}), countries: {...(c.ukrposhta?.countries||{}), [code]: {...rates, per_kg_usd: Number(e.target.value)}}}}))}
                      style={{ width: 80, padding: '5px 8px', border: '1px solid #e5e5e3', borderRadius: 8, fontSize: 13 }}
                    />
                  </td>
                  <td style={{ padding: '6px 12px', color: '#666' }}>
                    €{((rates.base_usd||0) * (cfg?.ukrposhta?.usd_eur_rate||0.92)).toFixed(2)}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => setCfg(c => { const countries = {...(c.ukrposhta?.countries||{})}; delete countries[code]; return {...c, ukrposhta: {...(c.ukrposhta||{}), countries}} })}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => {
              const code = prompt('Enter 2-letter country code (e.g. JP):')
              if (!code || code.length !== 2) return
              const cc = code.toUpperCase()
              setCfg(c => ({...c, ukrposhta: {...(c.ukrposhta||{}), countries: {...(c.ukrposhta?.countries||{}), [cc]: {base_usd: 10, per_kg_usd: 8}}}}))
            }}
            style={{ marginTop: 8, padding: '8px 18px', borderRadius: 999, border: '1.5px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            + Add country
          </button>
        </Section>

        <div style={{ textAlign: 'right' }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ background: '#000', color: '#fff', border: 'none', padding: '14px 36px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
      </div>
    </AdminOnly>
  )
}
