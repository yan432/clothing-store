'use client'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

const COUNTRIES = [
  ['AF','Afghanistan'],['AL','Albania'],['DZ','Algeria'],['AD','Andorra'],['AO','Angola'],
  ['AG','Antigua and Barbuda'],['AR','Argentina'],['AM','Armenia'],['AU','Australia'],
  ['AT','Austria'],['AZ','Azerbaijan'],['BS','Bahamas'],['BH','Bahrain'],['BD','Bangladesh'],
  ['BB','Barbados'],['BY','Belarus'],['BE','Belgium'],['BZ','Belize'],['BJ','Benin'],
  ['BT','Bhutan'],['BO','Bolivia'],['BA','Bosnia and Herzegovina'],['BW','Botswana'],
  ['BR','Brazil'],['BN','Brunei'],['BG','Bulgaria'],['BF','Burkina Faso'],['BI','Burundi'],
  ['CV','Cabo Verde'],['KH','Cambodia'],['CM','Cameroon'],['CA','Canada'],['CF','Central African Republic'],
  ['TD','Chad'],['CL','Chile'],['CN','China'],['CO','Colombia'],['KM','Comoros'],
  ['CD','Congo (DRC)'],['CG','Congo'],['CR','Costa Rica'],['HR','Croatia'],['CU','Cuba'],
  ['CY','Cyprus'],['CZ','Czech Republic'],['DK','Denmark'],['DJ','Djibouti'],['DM','Dominica'],
  ['DO','Dominican Republic'],['EC','Ecuador'],['EG','Egypt'],['SV','El Salvador'],
  ['GQ','Equatorial Guinea'],['ER','Eritrea'],['EE','Estonia'],['SZ','Eswatini'],['ET','Ethiopia'],
  ['FJ','Fiji'],['FI','Finland'],['FR','France'],['GA','Gabon'],['GM','Gambia'],['GE','Georgia'],
  ['DE','Germany'],['GH','Ghana'],['GR','Greece'],['GD','Grenada'],['GT','Guatemala'],
  ['GN','Guinea'],['GW','Guinea-Bissau'],['GY','Guyana'],['HT','Haiti'],['HN','Honduras'],
  ['HU','Hungary'],['IS','Iceland'],['IN','India'],['ID','Indonesia'],['IR','Iran'],['IQ','Iraq'],
  ['IE','Ireland'],['IL','Israel'],['IT','Italy'],['JM','Jamaica'],['JP','Japan'],['JO','Jordan'],
  ['KZ','Kazakhstan'],['KE','Kenya'],['KI','Kiribati'],['KW','Kuwait'],['KG','Kyrgyzstan'],
  ['LA','Laos'],['LV','Latvia'],['LB','Lebanon'],['LS','Lesotho'],['LR','Liberia'],
  ['LY','Libya'],['LI','Liechtenstein'],['LT','Lithuania'],['LU','Luxembourg'],['MG','Madagascar'],
  ['MW','Malawi'],['MY','Malaysia'],['MV','Maldives'],['ML','Mali'],['MT','Malta'],
  ['MH','Marshall Islands'],['MR','Mauritania'],['MU','Mauritius'],['MX','Mexico'],
  ['FM','Micronesia'],['MD','Moldova'],['MC','Monaco'],['MN','Mongolia'],['ME','Montenegro'],
  ['MA','Morocco'],['MZ','Mozambique'],['MM','Myanmar'],['NA','Namibia'],['NR','Nauru'],
  ['NP','Nepal'],['NL','Netherlands'],['NZ','New Zealand'],['NI','Nicaragua'],['NE','Niger'],
  ['NG','Nigeria'],['NO','Norway'],['OM','Oman'],['PK','Pakistan'],['PW','Palau'],
  ['PA','Panama'],['PG','Papua New Guinea'],['PY','Paraguay'],['PE','Peru'],['PH','Philippines'],
  ['PL','Poland'],['PT','Portugal'],['QA','Qatar'],['RO','Romania'],['RU','Russia'],
  ['RW','Rwanda'],['KN','Saint Kitts and Nevis'],['LC','Saint Lucia'],
  ['VC','Saint Vincent and the Grenadines'],['WS','Samoa'],['SM','San Marino'],
  ['ST','Sao Tome and Principe'],['SA','Saudi Arabia'],['SN','Senegal'],['RS','Serbia'],
  ['SC','Seychelles'],['SL','Sierra Leone'],['SG','Singapore'],['SK','Slovakia'],
  ['SI','Slovenia'],['SB','Solomon Islands'],['SO','Somalia'],['ZA','South Africa'],
  ['SS','South Sudan'],['ES','Spain'],['LK','Sri Lanka'],['SD','Sudan'],['SR','Suriname'],
  ['SE','Sweden'],['CH','Switzerland'],['SY','Syria'],['TW','Taiwan'],['TJ','Tajikistan'],
  ['TZ','Tanzania'],['TH','Thailand'],['TL','Timor-Leste'],['TG','Togo'],['TO','Tonga'],
  ['TT','Trinidad and Tobago'],['TN','Tunisia'],['TR','Turkey'],['TM','Turkmenistan'],
  ['TV','Tuvalu'],['UG','Uganda'],['UA','Ukraine'],['AE','United Arab Emirates'],
  ['GB','United Kingdom'],['US','United States'],['UY','Uruguay'],['UZ','Uzbekistan'],
  ['VU','Vanuatu'],['VE','Venezuela'],['VN','Vietnam'],['YE','Yemen'],['ZM','Zambia'],['ZW','Zimbabwe'],
]

const steps = [
  { n: 1, label: 'Cart', done: true },
  { n: 2, label: 'Details', active: true },
  { n: 3, label: 'Shipping', disabled: true },
  { n: 4, label: 'Payment', disabled: true },
]

function StepBar() {
  return (
    <div style={{display:'flex',alignItems:'center',marginBottom:40}}>
      {steps.map((s, i) => (
        <div key={s.n} style={{display:'flex',alignItems:'center',flex: i < steps.length - 1 ? 1 : 'none'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{
              width:32,height:32,borderRadius:'50%',
              background: s.active || s.done ? '#000' : 'transparent',
              border: s.active || s.done ? 'none' : '1.5px solid #ccc',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:13,fontWeight:500,
              color: s.active || s.done ? '#fff' : s.disabled ? '#ccc' : '#888',
            }}>
              {s.done && !s.active ? '✓' : s.n}
            </div>
            <p style={{fontSize:13,fontWeight:s.active?600:400,color:s.disabled?'#ccc':s.active?'#000':'#555',margin:0}}>
              {s.label}
            </p>
          </div>
          {i < steps.length - 1 && (
            <div style={{flex:1,height:1,background:'#e5e5e3',margin:'0 8px',marginBottom:20}}/>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CheckoutPage() {
  const { cart, total } = useCart()
  const { user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('guest')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: user?.email || '',
    phone: '',
    address: '', city: '', zip: '',
    country: 'DE',
  })

  function set(key, val) { setForm(f => ({...f, [key]: val})) }

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.zip.trim()) e.zip = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAuth(e) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(authEmail, authPassword)
      if (error) setAuthError(error.message)
      else { setForm(f => ({...f, email: authEmail})); setMode('guest') }
    } else {
      const { error } = await signUp(authEmail, authPassword)
      if (error) setAuthError(error.message)
      else setAuthError('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  async function handleContinue() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('https://clothing-store-production-983f.up.railway.app/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.qty,
            image_url: item.image_url || null,
            size: item.size || null,
          })),
          customer_email: form.email,
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          address: form.address,
          city: form.city,
          zip: form.zip,
          country: form.country,
          success_url: 'https://project-e38lc.vercel.app/success',
          cancel_url: 'https://project-e38lc.vercel.app/cart',
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Error: ' + JSON.stringify(data))
    } catch (e) {
      alert('Something went wrong: ' + e.message)
    }
    setLoading(false)
  }

  const inputStyle = (key) => ({
    padding:'13px 16px',borderRadius:12,fontSize:14,outline:'none',width:'100%',
    border: errors[key] ? '1.5px solid #ef4444' : '1px solid #e5e5e3',
    background:'#fff', boxSizing:'border-box',
  })

  const Field = ({ placeholder, fieldKey, type='text' }) => (
    <div>
      <input type={type} placeholder={placeholder} value={form[fieldKey]}
        onChange={e => { set(fieldKey, e.target.value); setErrors(err => ({...err, [fieldKey]: null})) }}
        style={inputStyle(fieldKey)}/>
      {errors[fieldKey] && <p style={{fontSize:11,color:'#ef4444',margin:'4px 0 0 4px'}}>{errors[fieldKey]}</p>}
    </div>
  )

  return (
    <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
      <StepBar />

      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:32,alignItems:'start'}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:600,margin:'0 0 24px'}}>Details</h1>

          {/* Auth toggle */}
          {!user && (
            <div style={{marginBottom:28}}>
              <div style={{display:'flex',gap:8,marginBottom:20}}>
                {[['guest','Continue as guest'],['login','Sign in'],['register','Register']].map(([m,label]) => (
                  <button key={m} onClick={() => { setMode(m); setAuthError('') }}
                    style={{padding:'8px 18px',borderRadius:999,fontSize:13,fontWeight:500,border:'1.5px solid',cursor:'pointer',
                      borderColor: mode === m ? '#000' : '#e5e5e3',
                      background: mode === m ? '#000' : '#fff',
                      color: mode === m ? '#fff' : '#555',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {(mode === 'login' || mode === 'register') && (
                <form onSubmit={handleAuth} style={{display:'flex',flexDirection:'column',gap:12,maxWidth:420,marginBottom:24}}>
                  {authError && (
                    <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 16px',fontSize:13,color:'#dc2626'}}>
                      {authError}
                    </div>
                  )}
                  <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                    style={{padding:'13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none'}}/>
                  <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                    style={{padding:'13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none'}}/>
                  <button type="submit" disabled={loading}
                    style={{background:'#000',color:'#fff',border:'none',padding:'13px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer',opacity:loading?0.6:1}}>
                    {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                </form>
              )}
            </div>
          )}

          {user && (
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',fontSize:14,color:'#166534',marginBottom:24}}>
              Signed in as {user.email}
            </div>
          )}

          {/* Contact */}
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Contact</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field placeholder="First name *" fieldKey="firstName" />
              <Field placeholder="Last name *" fieldKey="lastName" />
            </div>
            <Field placeholder="Email *" fieldKey="email" type="email" />
            <Field placeholder="Phone * e.g. +49 151 23456789" fieldKey="phone" type="tel" />
          </div>

          {/* Address */}
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:32}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Shipping address</p>
            <Field placeholder="Street address *" fieldKey="address" />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field placeholder="City *" fieldKey="city" />
              <Field placeholder="ZIP / Postal code *" fieldKey="zip" />
            </div>
            <select value={form.country} onChange={e => set('country', e.target.value)}
              style={{padding:'13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',background:'#fff',color:'#1a1a18'}}>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <button onClick={handleContinue} disabled={loading || cart.length === 0}
            style={{background:'#000',color:'#fff',border:'none',padding:'16px 40px',borderRadius:999,fontSize:14,fontWeight:600,cursor:'pointer',opacity:loading?0.6:1}}>
            {loading ? 'Processing...' : 'Continue to payment'}
          </button>
        </div>

        {/* Order summary */}
        <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:20,padding:24,position:'sticky',top:100}}>
          <h2 style={{fontSize:20,fontWeight:700,margin:'0 0 20px'}}>Order summary</h2>
          <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
            {cart.map(item => (
              <div key={item.id+(item.size||'')} style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:52,height:52,borderRadius:8,overflow:'hidden',background:'#eee',flexShrink:0}}>
                  {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:500,margin:'0 0 2px'}}>{item.name}</p>
                  <p style={{fontSize:12,color:'#aaa',margin:0}}>x{item.qty}{item.size ? ` • ${item.size}` : ''}</p>
                </div>
                <p style={{fontSize:14,fontWeight:500,margin:0}}>${(item.price*item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid #e5e5e3',paddingTop:16,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
              <span>Subtotal</span><span>${total.toFixed(2)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
              <span>Shipping</span><span>Calculated at checkout</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,marginTop:4}}>
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>
          <p style={{fontSize:11,color:'#bbb',textAlign:'center',marginTop:16,lineHeight:1.5}}>
            Payment details are entered securely on external checkout.
          </p>
        </div>
      </div>
    </main>
  )
}