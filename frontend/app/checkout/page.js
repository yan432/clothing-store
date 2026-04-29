'use client'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { getApiUrl, getAdminApiUrl } from '../lib/api'

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
  { n: 1, label: 'Cart', done: true, href: '/cart' },
  { n: 2, label: 'Details', active: true },
  { n: 3, label: 'Confirm', disabled: true },
  { n: 4, label: 'Payment', disabled: true },
]

function FormField({ placeholder, fieldKey, type = 'text', value, onChange, error, style }) {
  return (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={style}
      />
      {error && <p style={{fontSize:11,color:'#ef4444',margin:'4px 0 0 4px'}}>{error}</p>}
    </div>
  )
}

function StepBar() {
  return (
    <div style={{display:'flex',alignItems:'center',marginBottom:40}}>
      {steps.map((s, i) => (
        <div key={s.n} style={{display:'flex',alignItems:'center',flex: i < steps.length - 1 ? 1 : 'none'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            {s.href ? (
              <a href={s.href} style={{textDecoration:'none'}}>
                <div style={{
                  width:32,height:32,borderRadius:'50%',
                  background: s.active || s.done ? '#000' : 'transparent',
                  border: s.active || s.done ? 'none' : '1.5px solid #ccc',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:13,fontWeight:500,
                  color: s.active || s.done ? '#fff' : s.disabled ? '#ccc' : '#888',
                  cursor:'pointer',
                }}>
                  {s.done && !s.active ? '✓' : s.n}
                </div>
              </a>
            ) : (
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
            )}
            {s.href ? (
              <a href={s.href} style={{textDecoration:'none'}}>
                <p className="step-label" style={{fontWeight:s.active?600:400,color:s.disabled?'#ccc':s.active?'#000':'#555',cursor:'pointer'}}>
                  {s.label}
                </p>
              </a>
            ) : (
              <p className="step-label" style={{fontWeight:s.active?600:400,color:s.disabled?'#ccc':s.active?'#000':'#555'}}>
                {s.label}
              </p>
            )}
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
  const { user, signIn, signUp, verifySignUpCode, resendSignUpCode, requestPasswordReset } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState('guest')
  const [loading, setLoading] = useState(false)
  const [shippingResult, setShippingResult] = useState(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authVerifyCode, setAuthVerifyCode] = useState('')
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('')
  const [authNewsletterOptIn, setAuthNewsletterOptIn] = useState(true)
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: '',
    phone: '',
    address: '', city: '', zip: '',
    country: 'DE',
    comment: '',
  })

  function set(key, val) { setForm(f => ({...f, [key]: val})) }

  // Pre-fill form:
  // - If returning from Confirm (flag set) → restore sessionStorage exactly as typed
  // - Otherwise (fresh visit) → always fetch profile for logged-in users
  // - Guests with no flag → try sessionStorage
  useEffect(() => {
    const fromConfirm = sessionStorage.getItem('_from_confirm') === '1'

    if (fromConfirm) {
      // Returning from confirm page → restore what the user typed
      sessionStorage.removeItem('_from_confirm')
      try {
        const parsed = JSON.parse(sessionStorage.getItem('checkout_details') || '{}')
        if (Object.keys(parsed).length) { setForm(f => ({ ...f, ...parsed })); return }
      } catch {}
    }

    if (user?.email) {
      // Fresh visit while logged in → always load from profile (ignore stale sessionStorage)
      fetch(getAdminApiUrl('/user-profile') + '?email=' + encodeURIComponent(user.email))
        .then(r => r.ok ? r.json() : null)
        .then(profile => {
          setForm(f => ({
            firstName: profile?.first_name || f.firstName,
            lastName:  profile?.last_name  || f.lastName,
            email:     user.email,
            phone:     profile?.phone   || f.phone,
            address:   profile?.address || f.address,
            city:      profile?.city    || f.city,
            zip:       profile?.zip     || f.zip,
            country:   profile?.country || f.country,
            comment:   f.comment,
          }))
        })
        .catch(() => setForm(f => ({ ...f, email: user.email })))
    } else {
      // Guest, fresh visit → restore from sessionStorage if present
      try {
        const parsed = JSON.parse(sessionStorage.getItem('checkout_details') || '{}')
        if (Object.keys(parsed).length) setForm(f => ({ ...f, ...parsed }))
      } catch {}
    }
  }, [user])

  // Recalculate shipping whenever country or cart changes
  useEffect(() => {
    if (!cart.length) return
    setShippingLoading(true)
    fetch(getApiUrl('/shipping/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: form.country,
        items: cart.map(item => ({ id: item.id, quantity: item.qty, volumetric_weight: item.volumetric_weight })),
      }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setShippingResult(d))
      .catch(() => setShippingResult(null))
      .finally(() => setShippingLoading(false))
  }, [form.country, cart])

  const registerPasswordChecks = [
    { id: 'length', label: 'At least 8 characters', valid: authPassword.length >= 8 },
    { id: 'lower', label: 'At least one lowercase letter', valid: /[a-z]/.test(authPassword) },
    { id: 'upper', label: 'At least one uppercase letter', valid: /[A-Z]/.test(authPassword) },
    { id: 'digit', label: 'At least one number', valid: /\d/.test(authPassword) },
  ]
  const isRegisterPasswordValid = registerPasswordChecks.every((rule) => rule.valid)
  const registerPasswordScore = registerPasswordChecks.filter((rule) => rule.valid).length
  const registerPasswordStrength = registerPasswordScore <= 2 ? 'Weak' : registerPasswordScore === 3 ? 'Medium' : 'Strong'
  const registerStrengthColor = registerPasswordScore <= 2 ? '#b91c1c' : registerPasswordScore === 3 ? '#b45309' : '#15803d'

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Enter a valid email address'
    if (!form.phone.trim()) e.phone = 'Required'
    else if (!/^[+]?[\d][\d\s\-(). ]{5,}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number (e.g. +49 151 23456789)'
    if (!form.address.trim()) e.address = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.zip.trim()) e.zip = 'Required'
    else if (!/^[A-Z0-9][A-Z0-9\s\-]{2,9}$/i.test(form.zip.trim())) e.zip = 'Enter a valid postal code'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAuth(e) {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(authEmail, authPassword)
      if (error) setAuthError(error.message)
      else { setForm(f => ({...f, email: authEmail})); setMode('guest') }
    } else {
      if (!isRegisterPasswordValid) {
        setAuthError('Password does not meet security requirements')
        setLoading(false)
        return
      }
      if (authPassword !== authConfirmPassword) {
        setAuthError('Passwords do not match')
        setLoading(false)
        return
      }
      const { error, isExistingUser } = await signUp(authEmail, authPassword)
      if (error) setAuthError(error.message)
      else if (isExistingUser) setAuthError('This email is already registered. Please sign in or reset your password.')
      else {
        setPendingVerifyEmail(authEmail.trim().toLowerCase())
        setAuthMessage('Enter the verification code from your email.')
      }
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    setAuthError('')
    setAuthMessage('')
    const targetEmail = authEmail.trim().toLowerCase() || form.email.trim().toLowerCase()
    if (!targetEmail) {
      setAuthError('Enter your email first')
      return
    }
    setLoading(true)
    const { error } = await requestPasswordReset(targetEmail)
    if (error) setAuthError(error.message)
    else setAuthMessage('Password reset link sent to your email.')
    setLoading(false)
  }

  async function handleVerifyCode(e) {
    e.preventDefault()
    if (!pendingVerifyEmail || !authVerifyCode.trim()) return
    setAuthError('')
    setAuthMessage('')
    setLoading(true)
    const { error } = await verifySignUpCode(pendingVerifyEmail, authVerifyCode.trim())
    if (error) {
      setAuthError(error.message)
      setLoading(false)
      return
    }
    if (authNewsletterOptIn) {
      try {
        await fetch(getApiUrl('/email-subscribers/capture'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingVerifyEmail, source: 'signup_checkout' }),
        })
      } catch (_) {}
    }
    setForm((f) => ({ ...f, email: pendingVerifyEmail }))
    setPendingVerifyEmail('')
    setAuthVerifyCode('')
    setMode('guest')
    setAuthMessage('Email verified. You can continue checkout.')
    setLoading(false)
  }

  async function handleResendCode() {
    if (!pendingVerifyEmail) return
    setAuthError('')
    setAuthMessage('')
    setLoading(true)
    const { error } = await resendSignUpCode(pendingVerifyEmail)
    if (error) setAuthError(error.message)
    else setAuthMessage('New verification code sent.')
    setLoading(false)
  }

  function handleContinue() {
    if (!validate()) return
    if (shippingResult?.zone === 'unavailable') {
      setErrors(e => ({...e, country: 'We don\'t ship to this country yet'}))
      return
    }
    sessionStorage.setItem('checkout_details', JSON.stringify(form))
    if (shippingResult) sessionStorage.setItem('checkout_shipping', JSON.stringify(shippingResult))
    router.push('/confirm')
  }

  const inputStyle = (key) => ({
    padding:'13px 16px',borderRadius:12,fontSize:14,outline:'none',width:'100%',
    border: errors[key] ? '1.5px solid #ef4444' : '1px solid #e5e5e3',
    background:'#fff', boxSizing:'border-box',
  })

  return (
    <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
      <StepBar />
      <div className="checkout-layout">
        <div>
          <h1 style={{fontSize:24,fontWeight:600,margin:'0 0 24px'}}>Details</h1>

          {!user && (
            <div style={{marginBottom:28}}>
              <div style={{display:'flex',gap:8,marginBottom:20}}>
                {[['guest','Continue as guest'],['login','Sign in'],['register','Register']].map(([m,label]) => (
                  <button key={m} onClick={() => {
                    setMode(m)
                    setAuthError('')
                    setAuthMessage('')
                    setAuthPassword('')
                    setAuthConfirmPassword('')
                    setPendingVerifyEmail('')
                    setAuthVerifyCode('')
                    setShowAuthPassword(false)
                    setShowAuthConfirmPassword(false)
                  }}
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
                <>
                <form onSubmit={handleAuth} style={{display:'flex',flexDirection:'column',gap:12,maxWidth:420,marginBottom:24}}>
                  {authError && (
                    <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 16px',fontSize:13,color:'#dc2626'}}>
                      {authError}
                    </div>
                  )}
                  {authMessage && (
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:13,color:'#166534'}}>
                      {authMessage}
                    </div>
                  )}
                  <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                    style={{padding:'13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none'}}/>
                  <div style={{position:'relative'}}>
                    <input type={showAuthPassword ? 'text' : 'password'} placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                      style={{padding:'13px 72px 13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}/>
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword((v) => !v)}
                      style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',cursor:'pointer',fontSize:12,color:'#666'}}
                    >
                      {showAuthPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      style={{background:'none',border:'none',padding:0,textAlign:'left',fontSize:13,color:'#555',textDecoration:'underline',cursor:'pointer',width:'fit-content'}}
                    >
                      Forgot password?
                    </button>
                  )}
                  {mode === 'register' && (
                    <>
                      <div style={{position:'relative'}}>
                        <input type={showAuthConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} required
                          style={{padding:'13px 72px 13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%'}}/>
                        <button
                          type="button"
                          onClick={() => setShowAuthConfirmPassword((v) => !v)}
                          style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',cursor:'pointer',fontSize:12,color:'#666'}}
                        >
                          {showAuthConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <div style={{border:'1px solid #ecece8',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#666'}}>
                        <p style={{margin:'0 0 6px',fontWeight:600,color:registerStrengthColor}}>Password strength: {registerPasswordStrength}</p>
                        {registerPasswordChecks.map((rule) => (
                          <p key={rule.id} style={{margin:'2px 0',color:rule.valid ? '#15803d' : '#666'}}>
                            {rule.valid ? '✓' : '•'} {rule.label}
                          </p>
                        ))}
                      </div>
                      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#555',cursor:'pointer'}}>
                        <input
                          type="checkbox"
                          checked={authNewsletterOptIn}
                          onChange={(e) => setAuthNewsletterOptIn(e.target.checked)}
                        />
                        I want to receive newsletter updates
                      </label>
                    </>
                  )}
                  <button type="submit" disabled={loading}
                    style={{background:'#000',color:'#fff',border:'none',padding:'13px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer',opacity:loading?0.6:1}}>
                    {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                </form>
              {mode === 'register' && pendingVerifyEmail && (
                <form onSubmit={handleVerifyCode} style={{display:'flex',flexDirection:'column',gap:10,maxWidth:420,marginBottom:24,border:'1px solid #ecece8',borderRadius:12,padding:'12px 14px'}}>
                  <p style={{margin:0,fontSize:13,color:'#555'}}>Verification code for <strong>{pendingVerifyEmail}</strong></p>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter code"
                    value={authVerifyCode}
                    onChange={(e) => setAuthVerifyCode(e.target.value)}
                    style={{padding:'12px 14px',borderRadius:10,border:'1px solid #e5e5e3',fontSize:14,outline:'none'}}
                  />
                  <div style={{display:'flex',gap:8}}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{background:'#000',color:'#fff',padding:'10px 14px',borderRadius:999,fontSize:13,fontWeight:500,border:'none',cursor:'pointer',opacity: loading ? 0.6 : 1}}
                    >
                      Verify code
                    </button>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={loading}
                      style={{background:'#fff',color:'#222',padding:'10px 14px',borderRadius:999,fontSize:13,fontWeight:500,border:'1px solid #ddd',cursor:'pointer',opacity: loading ? 0.6 : 1}}
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              )}
                </>
              )}
            </div>
          )}

          {user && (
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',fontSize:14,color:'#166534',marginBottom:24}}>
              Signed in as {user.email}
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Contact</p>
            <div className="checkout-2col">
              <FormField
                placeholder="First name *"
                fieldKey="firstName"
                value={form.firstName}
                error={errors.firstName}
                style={inputStyle('firstName')}
                onChange={e => { set('firstName', e.target.value); setErrors(err => ({...err, firstName: null})) }}
              />
              <FormField
                placeholder="Last name *"
                fieldKey="lastName"
                value={form.lastName}
                error={errors.lastName}
                style={inputStyle('lastName')}
                onChange={e => { set('lastName', e.target.value); setErrors(err => ({...err, lastName: null})) }}
              />
            </div>
            <FormField
              placeholder="Email *"
              fieldKey="email"
              type="email"
              value={form.email}
              error={errors.email}
              style={inputStyle('email')}
              onChange={e => { set('email', e.target.value); setErrors(err => ({...err, email: null})) }}
            />
            <FormField
              placeholder="Phone * e.g. +49 151 23456789"
              fieldKey="phone"
              type="tel"
              value={form.phone}
              error={errors.phone}
              style={inputStyle('phone')}
              onChange={e => { set('phone', e.target.value); setErrors(err => ({...err, phone: null})) }}
            />
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:32}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Shipping address</p>
            <FormField
              placeholder="Street address *"
              fieldKey="address"
              value={form.address}
              error={errors.address}
              style={inputStyle('address')}
              onChange={e => { set('address', e.target.value); setErrors(err => ({...err, address: null})) }}
            />
            <div className="checkout-2col">
              <FormField
                placeholder="City *"
                fieldKey="city"
                value={form.city}
                error={errors.city}
                style={inputStyle('city')}
                onChange={e => { set('city', e.target.value); setErrors(err => ({...err, city: null})) }}
              />
              <FormField
                placeholder="ZIP / Postal code *"
                fieldKey="zip"
                value={form.zip}
                error={errors.zip}
                style={inputStyle('zip')}
                onChange={e => { set('zip', e.target.value); setErrors(err => ({...err, zip: null})) }}
              />
            </div>
            <div style={{position:'relative'}}>
              <select value={form.country} onChange={e => set('country', e.target.value)}
                style={{display:'block',padding:'13px 40px 13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',background:'#fff',color:'#1a1a18',width:'100%',boxSizing:'border-box',height:50,appearance:'none',WebkitAppearance:'none',cursor:'pointer'}}>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              <svg style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#888'}} width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1L6 7L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Order note */}
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Order note <span style={{fontWeight:400,textTransform:'none',letterSpacing:0}}>(optional)</span></p>
            <textarea
              placeholder="E.g. please deliver after 15 Jan, leave with neighbour, gift — no invoice, etc."
              value={form.comment}
              onChange={e => set('comment', e.target.value)}
              rows={3}
              style={{padding:'13px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',width:'100%',boxSizing:'border-box',resize:'vertical',fontFamily:'inherit',color:'#1a1a18',lineHeight:1.5}}
            />
          </div>

          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={() => router.push('/cart')}
              style={{background:'none',border:'1.5px solid #e5e5e3',padding:'15px 24px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer',color:'#555'}}>
              ← Back
            </button>
            <button
              onClick={handleContinue}
              disabled={cart.length === 0 || shippingResult?.zone === 'unavailable' || shippingLoading}
              title={shippingResult?.zone === 'unavailable' ? 'Delivery not available to this country' : undefined}
              style={{background:'#000',color:'#fff',border:'none',padding:'16px 40px',borderRadius:999,fontSize:14,fontWeight:600,cursor: (cart.length === 0 || shippingResult?.zone === 'unavailable') ? 'not-allowed' : 'pointer',opacity: (cart.length === 0 || shippingResult?.zone === 'unavailable') ? 0.4 : 1}}>
              Continue to confirm
            </button>
          </div>
        </div>

        <div className="checkout-sidebar" style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:20,padding:24,position:'sticky',top:100}}>
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
                <p style={{fontSize:14,fontWeight:500,margin:0}}>€{(item.price*item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid #e5e5e3',paddingTop:16,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
              <span>Subtotal</span><span>€{total.toFixed(2)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
              <span>Shipping</span>
              <span style={{color: shippingResult?.zone === 'unavailable' ? '#ef4444' : '#555'}}>
                {shippingLoading ? '…' :
                  shippingResult?.zone === 'unavailable' ? 'Not available' :
                  shippingResult?.price_eur != null ? `€${shippingResult.price_eur.toFixed(2)}` :
                  '—'}
              </span>
            </div>
            {shippingResult?.zone === 'unavailable' && (
              <p style={{fontSize:11,color:'#ef4444',margin:'4px 0 0',textAlign:'right'}}>
                We don't ship to this country yet
              </p>
            )}
            {shippingResult?.label && shippingResult?.zone !== 'unavailable' && (
              <p style={{fontSize:11,color:'#aaa',margin:'4px 0 0',textAlign:'right'}}>
                {shippingResult.label} · {shippingResult.weight_kg} kg
              </p>
            )}
          </div>
          <p style={{fontSize:11,color:'#bbb',textAlign:'center',marginTop:16,lineHeight:1.5}}>
            Payment details are entered securely on external checkout.
          </p>
        </div>
      </div>
    </main>
  )
}