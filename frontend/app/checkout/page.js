'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'next/navigation'
import { getApiUrl } from '../lib/api'
import { trackCheckoutStarted, trackCompleteRegistration, trackNewsletterSignup, trackPaymentInfo, trackShippingInfo } from '../lib/track'
import { getStoredMetaAttribution, getStoredUtm } from '../components/UtmCapture'
import { getMessages, pathForLocale, UK_LOCALE } from '../lib/i18n'
import { currencyForLocale, priceForLocale, eurToUah, formatPrice } from '../lib/money'
import { useUahRate } from '../lib/useUahRate'
import { buildItemImageAlt } from '../lib/seoText'

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

const AUTOCOMPLETE_MAP = {
  firstName: 'given-name',
  lastName:  'family-name',
  email:     'email',
  phone:     'tel',
  address:   'street-address',
  city:      'address-level2',
  zip:       'postal-code',
  novaPoshtaCity: 'address-level2',
  novaPoshtaBranch: 'off',
}

const NAME_MAP = {
  firstName: 'given-name',
  lastName:  'family-name',
  email:     'email',
  phone:     'tel',
  address:   'street-address',
  city:      'city',
  zip:       'postal-code',
  novaPoshtaCity: 'city',
  novaPoshtaBranch: 'nova-poshta-branch',
}

const DEFAULT_SHIPPING = 30
const DELIVERY_METHOD_ADDRESS = 'address'
const DELIVERY_METHOD_NOVA_POSHTA_BRANCH = 'nova_poshta_branch'
const UK_COUNTRY_FALLBACKS = {
  AT: 'Австрія',
  BE: 'Бельгія',
  CA: 'Канада',
  CH: 'Швейцарія',
  CZ: 'Чехія',
  DE: 'Німеччина',
  DK: 'Данія',
  EE: 'Естонія',
  ES: 'Іспанія',
  FI: 'Фінляндія',
  FR: 'Франція',
  GB: 'Велика Британія',
  IE: 'Ірландія',
  IT: 'Італія',
  LT: 'Литва',
  LV: 'Латвія',
  MD: 'Молдова',
  NL: 'Нідерланди',
  NO: 'Норвегія',
  PL: 'Польща',
  PT: 'Португалія',
  RO: 'Румунія',
  SE: 'Швеція',
  SK: 'Словаччина',
  UA: 'Україна',
  US: 'США',
}

function FormField({ placeholder, fieldKey, type = 'text', value, onChange, error, style, disabled = false }) {
  return (
    <div>
      <input
        type={type}
        name={NAME_MAP[fieldKey] || fieldKey}
        autoComplete={AUTOCOMPLETE_MAP[fieldKey] || 'on'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={style}
        disabled={disabled}
      />
      {error && <p style={{fontSize:11,color:'#ef4444',margin:'4px 0 0 4px'}}>{error}</p>}
    </div>
  )
}

// Split a Meta-Shops content_id (e.g. "riot-bomber-m") into { slug, size }.
// Catalog variant IDs are built as `${slug}-${size}` (size lowercased, spaces→hyphens).
const KNOWN_SIZE_SUFFIXES = [
  ['-xxs',      'XXS'],
  ['-xs',       'XS'],
  ['-s',        'S'],
  ['-m',        'M'],
  ['-l',        'L'],
  ['-xl',       'XL'],
  ['-xxl',      'XXL'],
  ['-one-size', 'One Size'],
]
function parseVariantId(variantId) {
  for (const [suffix, size] of KNOWN_SIZE_SUFFIXES) {
    if (variantId.endsWith(suffix)) {
      return { slug: variantId.slice(0, -suffix.length), size }
    }
  }
  return { slug: variantId, size: null }
}

async function fetchProduct(slug) {
  try {
    const res = await fetch(getApiUrl(`/products/${slug}`))
    return res.ok ? await res.json() : null
  } catch { return null }
}

function BuyParamEffect({ addToCartRef, addManyToCartRef, setDrawerOpen }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    // Meta Shops checkout URL: ?products=slug-size:qty,slug-size:qty&coupon=CODE
    const productsParam = searchParams.get('products')
    if (productsParam) {
      const coupon = searchParams.get('coupon')
      if (coupon) {
        try { sessionStorage.setItem('pending_coupon', coupon) } catch {}
      }
      ;(async () => {
        const rawEntries = productsParam.split(',').map(s => s.trim()).filter(Boolean)
        const fetched = await Promise.all(rawEntries.map(async entry => {
          const [rawId, rawQty] = entry.split(':')
          const qty = Math.max(1, parseInt(rawQty || '1', 10) || 1)
          const { slug, size } = parseVariantId(rawId)
          const product = await fetchProduct(slug)
          if (!product || product.is_hidden) return null
          return { product: size ? { ...product, size } : product, qty }
        }))
        const cartEntries = fetched.filter(Boolean)
        if (cartEntries.length) addManyToCartRef.current(cartEntries)
        setDrawerOpen(false)
      })()
      return
    }

    // Google Shopping: ?buy={slug-or-id}
    const buyId = searchParams.get('buy')
    if (!buyId) return
    fetchProduct(buyId).then(product => {
      if (!product || product.is_hidden) return
      addToCartRef.current(product)
      setDrawerOpen(false)
    })
  }, [searchParams, addToCartRef, addManyToCartRef, setDrawerOpen])
  return null
}

function CheckoutPage({ locale = 'en' }) {
  const d = getMessages(locale)
  const { cart, total, addToCart, addManyToCart, setDrawerOpen } = useCart()
  const currency = currencyForLocale(locale)
  const uahRate = useUahRate(locale === UK_LOCALE)
  const lineUnit = (item) => priceForLocale(item, locale, uahRate)
  const displayTotal = cart.reduce((sum, i) => sum + lineUnit(i) * i.qty, 0)
  const addToCartRef = useRef(addToCart)
  useEffect(() => { addToCartRef.current = addToCart }, [addToCart])
  const addManyToCartRef = useRef(addManyToCart)
  useEffect(() => { addManyToCartRef.current = addManyToCart }, [addManyToCart])
  const { user, signIn, signUp, resendSignUpVerification, requestPasswordReset } = useAuth()
  const [mode, setMode] = useState('guest')
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [shippingResult, setShippingResult] = useState(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState('')
  const [promo, setPromo] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('')
  const [authNewsletterOptIn, setAuthNewsletterOptIn] = useState(true)
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [clientReady, setClientReady] = useState(false)
  const activeAuthInputRef = useRef(null)
  const authPasswordInputRef = useRef(null)
  const paymentTracked = useRef(false)
  const pendingCouponApplied = useRef(false)

  useEffect(() => { setClientReady(true) }, [])

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: '',
    phone: '',
    address: '', city: '', zip: '',
    country: locale === UK_LOCALE ? 'UA' : 'DE',
    deliveryMethod: locale === UK_LOCALE ? DELIVERY_METHOD_NOVA_POSHTA_BRANCH : DELIVERY_METHOD_ADDRESS,
    novaPoshtaCity: '',
    novaPoshtaBranch: '',
    comment: '',
  })

  function set(key, val) { setForm(f => ({...f, [key]: val})) }
  const checkoutLocked = paymentLoading
  const paymentRedirectCopy = locale === UK_LOCALE
    ? 'Тебе буде перенаправлено до Stripe, щоб безпечно завершити оплату.'
    : 'You will be redirected to Stripe to complete the payment securely.'
  const isUkraineDelivery = form.country === 'UA'
  const isNovaPoshtaBranchDelivery = isUkraineDelivery && form.deliveryMethod === DELIVERY_METHOD_NOVA_POSHTA_BRANCH
  const checkoutShippingCity = isNovaPoshtaBranchDelivery ? form.novaPoshtaCity : form.city
  const checkoutShippingLine1 = isNovaPoshtaBranchDelivery ? `Nova Poshta branch: ${form.novaPoshtaBranch}` : form.address
  const checkoutShippingZip = isNovaPoshtaBranchDelivery ? '' : form.zip
  const checkoutShippingLabel = isUkraineDelivery
    ? (isNovaPoshtaBranchDelivery ? d.checkout.novaPoshtaBranchDelivery : d.checkout.novaPoshtaAddressDelivery)
    : (shippingResult?.label || d.checkout.shippingStandard)
  const shippingReadyForCheckout = Boolean(
    cart.length &&
    !shippingLoading &&
    !shippingError &&
    shippingResult?.zone !== 'unavailable' &&
    shippingResult?.price_eur != null
  )

  function rememberAuthInput(e) {
    activeAuthInputRef.current = e.currentTarget
  }

  function restoreAuthCaret() {
    const restore = () => {
      const input = activeAuthInputRef.current?.isConnected
        ? activeAuthInputRef.current
        : authPasswordInputRef.current
      if (!input || !input.isConnected) return
      input.focus({ preventScroll: true })
      try {
        const end = input.value.length
        input.setSelectionRange(end, end)
      } catch (_) {}
    }
    requestAnimationFrame(restore)
    setTimeout(restore, 60)
  }

  function showAuthError(text) {
    setAuthError(text)
    restoreAuthCaret()
  }

  // Fire InitiateCheckout pixel event once when cart is non-empty
  const initiateTracked = useRef(false)
  useEffect(() => {
    if (!cart.length || initiateTracked.current) return
    initiateTracked.current = true
    trackCheckoutStarted({ cart })
  }, [cart])


  // Pre-fill form:
  // - If returning from Confirm (flag set) → restore sessionStorage exactly as typed
  // - Otherwise (fresh visit) → always fetch profile for logged-in users
  // - Guests with no flag → try sessionStorage
  useEffect(() => {
    let cancelled = false
    const restoreForm = (details) => {
      Promise.resolve().then(() => {
        if (!cancelled) setForm(f => ({ ...f, ...details }))
      })
    }
    const fromConfirm = sessionStorage.getItem('_from_confirm') === '1'

    if (fromConfirm) {
      // Returning from confirm page → restore what the user typed
      sessionStorage.removeItem('_from_confirm')
      try {
        const parsed = JSON.parse(sessionStorage.getItem('checkout_details') || '{}')
        if (Object.keys(parsed).length) {
          restoreForm(parsed)
          return () => { cancelled = true }
        }
      } catch {}
    }

    if (user?.email) {
      // Fresh visit while logged in → always load from profile (ignore stale sessionStorage)
      fetch('/api/user-profile')
        .then(r => r.ok ? r.json() : null)
        .then(profile => {
          if (cancelled) return
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
        .catch(() => { if (!cancelled) setForm(f => ({ ...f, email: user.email })) })
    } else {
      // Guest, fresh visit → restore from sessionStorage if present
      try {
        const parsed = JSON.parse(sessionStorage.getItem('checkout_details') || '{}')
        if (Object.keys(parsed).length) restoreForm(parsed)
      } catch {}
    }
    return () => { cancelled = true }
  }, [user?.email])

  // Recalculate shipping whenever country or cart changes
  useEffect(() => {
    if (!cart.length) {
      setShippingResult(null)
      setShippingError('')
      setShippingLoading(false)
      return
    }
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return null
      setShippingLoading(true)
      setShippingError('')
      return fetch(getApiUrl('/shipping/calculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: form.country,
          shipping_method: isUkraineDelivery ? form.deliveryMethod : undefined,
          items: cart.map(item => ({ id: item.id, quantity: item.qty, volumetric_weight: item.volumetric_weight })),
        }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(result => {
          if (!cancelled) {
            setShippingResult(result)
            setShippingError(result?.zone === 'unavailable' ? d.checkout.deliveryUnavailable : '')
          }
        })
        .catch(() => {
          if (!cancelled) {
            setShippingResult(null)
            setShippingError(d.checkout.shippingFailed)
          }
        })
        .finally(() => { if (!cancelled) setShippingLoading(false) })
    })
    return () => { cancelled = true }
  }, [form.country, form.deliveryMethod, isUkraineDelivery, cart, d.checkout.deliveryUnavailable, d.checkout.shippingFailed])

  const registerPasswordChecks = [
    { id: 'length', label: d.checkout.auth.checks[0], valid: authPassword.length >= 8 },
    { id: 'lower', label: d.checkout.auth.checks[1], valid: /[a-z]/.test(authPassword) },
    { id: 'upper', label: d.checkout.auth.checks[2], valid: /[A-Z]/.test(authPassword) },
    { id: 'digit', label: d.checkout.auth.checks[3], valid: /\d/.test(authPassword) },
  ]
  const isRegisterPasswordValid = registerPasswordChecks.every((rule) => rule.valid)
  const registerPasswordScore = registerPasswordChecks.filter((rule) => rule.valid).length
  const registerPasswordStrength = registerPasswordScore <= 2 ? d.checkout.auth.strengths.weak : registerPasswordScore === 3 ? d.checkout.auth.strengths.medium : d.checkout.auth.strengths.strong
  const registerStrengthColor = registerPasswordScore <= 2 ? '#b91c1c' : registerPasswordScore === 3 ? '#b45309' : '#15803d'
  const regionNames = useMemo(() => {
    try { return new Intl.DisplayNames([locale === 'uk' ? 'uk' : 'en'], { type: 'region' }) }
    catch { return null }
  }, [locale])
  const countryName = (code, fallback) => {
    if (locale === UK_LOCALE && UK_COUNTRY_FALLBACKS[code]) return UK_COUNTRY_FALLBACKS[code]
    return clientReady ? (regionNames?.of(code) || fallback) : fallback
  }
  const shippingCostEur = Number(shippingResult?.price_eur ?? DEFAULT_SHIPPING)
  const shippingDisplayBase = shippingResult?.price_eur != null
    ? (currency === 'UAH'
        ? (shippingResult.price_uah != null ? Number(shippingResult.price_uah) : eurToUah(shippingResult.price_eur, uahRate))
        : Number(shippingResult.price_eur))
    : 0
  let discountDisplay = 0
  if (promoApplied) {
    if (promoApplied.discount_type === 'percent') {
      discountDisplay = displayTotal * Number(promoApplied.discount_value || 0) / 100
    } else if (promoApplied.discount_type === 'fixed') {
      const eurDiscount = Number(promoApplied.discount_amount || 0)
      discountDisplay = total > 0 ? displayTotal * (eurDiscount / total) : 0
    }
  }
  const safeDiscount = Math.min(displayTotal, Math.max(0, discountDisplay))
  const promoFreeShipping = promoApplied?.discount_type === 'free_shipping'
  const shippingTotalDisplay = promoFreeShipping ? 0 : shippingDisplayBase
  const finalTotal = Math.max(0, displayTotal - safeDiscount + shippingTotalDisplay)
  const discountEur = promoApplied ? Math.min(total, Math.max(0, Number(promoApplied.discount_amount || 0))) : 0
  const shippingEur = promoFreeShipping ? 0 : (shippingResult?.price_eur != null ? Number(shippingResult.price_eur) : 0)
  const finalTotalEur = Math.max(0, total - discountEur + shippingEur)
  useEffect(() => {
    if (!cart.length || shippingLoading || pendingCouponApplied.current) return
    let pending = ''
    try { pending = sessionStorage.getItem('pending_coupon') || '' } catch {}
    if (!pending) return
    pendingCouponApplied.current = true
    setPromo(pending)
    applyPromo(pending).finally(() => {
      try { sessionStorage.removeItem('pending_coupon') } catch {}
    })
    // applyPromo is intentionally excluded so a stored coupon is applied once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length, shippingLoading, shippingCostEur])

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = d.checkout.errors.required
    if (!form.lastName.trim()) e.lastName = d.checkout.errors.required
    if (!form.email.trim()) e.email = d.checkout.errors.required
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = d.checkout.errors.email
    if (!form.phone.trim()) e.phone = d.checkout.errors.required
    else if (!/^[+]?[\d][\d\s\-(). ]{5,}$/.test(form.phone.trim())) e.phone = d.checkout.errors.phone
    if (isNovaPoshtaBranchDelivery) {
      if (!form.novaPoshtaCity.trim()) e.novaPoshtaCity = d.checkout.errors.required
      if (!form.novaPoshtaBranch.trim()) e.novaPoshtaBranch = d.checkout.errors.required
    } else {
      if (!form.address.trim()) e.address = d.checkout.errors.required
      if (!form.city.trim()) e.city = d.checkout.errors.required
      if (!form.zip.trim()) e.zip = d.checkout.errors.required
      else if (!/^[A-Z0-9][A-Z0-9\s\-]{2,9}$/i.test(form.zip.trim())) e.zip = d.checkout.errors.zip
    }
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
      if (error) showAuthError(error.message)
      else { setForm(f => ({...f, email: authEmail})); setMode('guest') }
    } else {
      if (!isRegisterPasswordValid) {
        showAuthError(d.checkout.auth.passwordRequirements)
        setLoading(false)
        return
      }
      if (authPassword !== authConfirmPassword) {
        showAuthError(d.checkout.auth.passwordMismatch)
        setLoading(false)
        return
      }
      const { error, isExistingUser } = await signUp(authEmail, authPassword, {
        preferredLocale: locale,
        redirectPath: pathForLocale('/auth', locale),
      })
      if (error) showAuthError(error.message)
      else if (isExistingUser) showAuthError(d.checkout.auth.existingUser)
      else {
        const normalizedEmail = authEmail.trim().toLowerCase()
        setPendingVerifyEmail(normalizedEmail)
        setForm((f) => ({ ...f, email: normalizedEmail }))
        if (authNewsletterOptIn) {
          try {
            await fetch(getApiUrl('/email-subscribers/capture'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: normalizedEmail,
                source: 'signup_checkout',
                preferred_locale: locale,
                metadata: { preferred_locale: locale },
              }),
            })
            trackNewsletterSignup({ source: 'signup_checkout' })
          } catch (_) {}
        }
        trackCompleteRegistration({ source: 'checkout_signup' })
        setAuthMessage(d.checkout.auth.verificationSent)
      }
    }
    setLoading(false)
    restoreAuthCaret()
  }

  async function handleForgotPassword() {
    setAuthError('')
    setAuthMessage('')
    const targetEmail = authEmail.trim().toLowerCase() || form.email.trim().toLowerCase()
    if (!targetEmail) {
      showAuthError(d.checkout.auth.enterEmailFirst)
      return
    }
    setLoading(true)
    const { error } = await requestPasswordReset(targetEmail)
    if (error) showAuthError(error.message)
    else setAuthMessage(d.checkout.auth.passwordResetSent)
    setLoading(false)
  }

  async function handleResendVerification() {
    if (!pendingVerifyEmail) return
    setAuthError('')
    setAuthMessage('')
    setLoading(true)
    const { error } = await resendSignUpVerification(pendingVerifyEmail)
    if (error) showAuthError(error.message)
    else setAuthMessage(d.checkout.auth.newVerificationSent)
    setLoading(false)
  }

  async function applyPromo(rawCode = promo) {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!code) {
      setPromoError(d.confirm.enterPromoError)
      return
    }
    setPromoLoading(true)
    try {
      const res = await fetch(`${getApiUrl('/promo-codes/validate')}?code=${encodeURIComponent(code)}&subtotal=${encodeURIComponent(String(total))}&shipping=${encodeURIComponent(String(shippingCostEur))}`)
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setPromoError(data?.message || d.confirm.invalidPromo)
        setPromoApplied(null)
        return
      }
      setPromoApplied({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        discount_amount: data.discount_amount,
      })
      setPromo(code)
      setPromoError('')
    } catch {
      setPromoError(d.confirm.failedPromo)
      setPromoApplied(null)
    } finally {
      setPromoLoading(false)
    }
  }

  async function createCheckoutPaymentIntent({ skipValidation = false } = {}) {
    if (!skipValidation && !validate()) return null
    if (shippingResult?.zone === 'unavailable') {
      setErrors(e => ({...e, country: d.checkout.deliveryUnavailable}))
      return null
    }
    if (!shippingReadyForCheckout) {
      setShippingError(cart.length ? d.checkout.shippingFailed : d.checkout.shippingNoCart)
      return null
    }
    sessionStorage.setItem('checkout_details', JSON.stringify(form))
    if (shippingResult) sessionStorage.setItem('checkout_shipping', JSON.stringify(shippingResult))
    trackShippingInfo({
      email:        form.email.trim().toLowerCase(),
      cart,
      value:        total + Number(shippingResult?.price_eur || 0),
      shippingTier: isUkraineDelivery ? `${form.country}:${form.deliveryMethod}` : form.country,
    })
    if (!paymentTracked.current) {
      paymentTracked.current = true
      trackPaymentInfo({
        email: form.email.trim().toLowerCase(),
        cart,
        value: finalTotalEur,
        paymentType: 'Stripe',
      })
    }

    // Fire-and-forget: save abandoned cart so we can follow up if they don't complete
    const cartTotal = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0)
    fetch(getApiUrl('/abandoned-cart'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:      form.email.trim().toLowerCase(),
        first_name: form.firstName.trim(),
        total_eur:  Math.round(cartTotal * 100) / 100,
        preferred_locale: locale,
        items: cart.map(item => ({
          id:        item.id,
          name:      item.name,
          price:     parseFloat(item.price),
          quantity:  item.qty,
          image_url: item.image_url || null,
          size:      item.size || null,
          slug:      item.slug  || null,
        })),
      }),
    }).catch(() => {})

    setPaymentLoading(true)
    try {
      const origin = window.location.origin
      const res = await fetch(getApiUrl('/checkout'), {
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
          customer_email: form.email.trim().toLowerCase(),
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          address: isNovaPoshtaBranchDelivery ? '' : form.address,
          city: isNovaPoshtaBranchDelivery ? '' : form.city,
          zip: isNovaPoshtaBranchDelivery ? '' : form.zip,
          country: form.country,
          shipping_method: isUkraineDelivery ? form.deliveryMethod : DELIVERY_METHOD_ADDRESS,
          nova_poshta_city: isNovaPoshtaBranchDelivery ? form.novaPoshtaCity : undefined,
          nova_poshta_branch: isNovaPoshtaBranchDelivery ? form.novaPoshtaBranch : undefined,
          promo_code: promoApplied?.code || null,
          comment: form.comment || null,
          preferred_locale: locale,
          return_url: `${origin}${pathForLocale('/success', locale)}`,
          cancel_url: `${origin}${pathForLocale('/checkout', locale)}`,
          utm: getStoredUtm() || undefined,
          meta: getStoredMetaAttribution() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = data?.detail
        const message = typeof detail === 'string' ? detail : detail?.message || d.confirm.checkoutFailed
        alert(message)
        setPaymentLoading(false)
        return null
      }
      const pendingOrder = {
        order_id: data.order_id || data.id,
        total: finalTotal,
        total_eur: finalTotalEur,
        currency,
        items: cart.map(item => ({
          product_id: item.id,
          slug: item.slug || null,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.qty,
          size: item.size || null,
          category: item.category || null,
        })),
      }
      const rememberPendingOrder = () => {
        try { localStorage.setItem('pending_order', JSON.stringify(pendingOrder)) }
        catch (_) {}
      }
      if (data.client_secret && data.payment_intent_id) {
        rememberPendingOrder()
        setPaymentLoading(false)
        return data
      }
      if (data.url) {
        rememberPendingOrder()
        window.location.href = data.url
        return data
      }
      const requestId = data.request_id || data.detail?.request_id || null
      alert(`${d.confirm.checkoutFailed}${requestId ? ` ${d.confirm.reference}: ${requestId}` : ''}`)
      setPaymentLoading(false)
      return null
    } catch {
      alert(d.confirm.checkoutFailed)
      setPaymentLoading(false)
      return null
    }
  }

  const inputStyle = (key) => ({
    padding:'13px 16px',borderRadius:0,fontSize:16,outline:'none',width:'100%',
    border: errors[key] ? '1.5px solid #ef4444' : '1px solid var(--edm-line)',
    background:'#fff', boxSizing:'border-box',
  })

  return (
    <main className="checkout-page">
      <Suspense fallback={null}>
        <BuyParamEffect
          addToCartRef={addToCartRef}
          addManyToCartRef={addManyToCartRef}
          setDrawerOpen={setDrawerOpen}
        />
      </Suspense>

      <div className="checkout-onepage-layout">
        <div className="checkout-main-column">
          <div className="checkout-main-top">
            <a href={pathForLocale('/', locale)} className="checkout-page-logo checkout-inline-logo">edm.clothes</a>

            {!user && (
              <div className="checkout-auth-switch" aria-label="Checkout mode">
                {[
                  ['guest', d.checkout.auth.guest],
                  ['login', d.checkout.auth.login],
                  ['register', d.checkout.auth.register],
                ].map(([m,label]) => (
                  <button key={m} type="button" onClick={() => {
                    setMode(m)
                    setAuthError('')
                    setAuthMessage('')
                    setAuthPassword('')
                    setAuthConfirmPassword('')
                    setPendingVerifyEmail('')
                    setShowAuthPassword(false)
                    setShowAuthConfirmPassword(false)
                  }} className={mode === m ? 'is-active' : ''}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!user && (mode === 'login' || mode === 'register') && (
            <>
              <form id={`checkout-auth-${mode}-form`} name={`checkout_auth_${mode}`} onSubmit={handleAuth} className="checkout-auth-form">
                {authError && <div className="checkout-alert error">{authError}</div>}
                {authMessage && <div className="checkout-alert success">{authMessage}</div>}
                <input type="email" name="email" autoComplete="email" placeholder="Email" value={authEmail} onFocus={rememberAuthInput} onChange={e => setAuthEmail(e.target.value)} required />
                <div className="checkout-password-field">
                  <input
                    type={showAuthPassword ? 'text' : 'password'}
                    name={mode === 'login' ? 'current-password' : 'new-password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={d.checkout.auth.password}
                    value={authPassword}
                    ref={authPasswordInputRef}
                    onFocus={rememberAuthInput}
                    onChange={e => setAuthPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowAuthPassword((v) => !v)}>
                    {showAuthPassword ? d.checkout.auth.hide : d.checkout.auth.show}
                  </button>
                </div>
                {mode === 'login' && (
                  <button type="button" onClick={handleForgotPassword} disabled={loading} className="checkout-link-button">
                    {d.checkout.auth.forgotPassword}
                  </button>
                )}
                {mode === 'register' && (
                  <>
                    <div className="checkout-password-field">
                    <input
                      type={showAuthConfirmPassword ? 'text' : 'password'}
                      name="new-password-confirm"
                      autoComplete="new-password"
                      placeholder={d.checkout.auth.confirmPassword}
                      value={authConfirmPassword}
                      onFocus={rememberAuthInput}
                      onChange={e => setAuthConfirmPassword(e.target.value)}
                      required
                    />
                      <button type="button" onClick={() => setShowAuthConfirmPassword((v) => !v)}>
                        {showAuthConfirmPassword ? d.checkout.auth.hide : d.checkout.auth.show}
                      </button>
                    </div>
                    <div className="checkout-password-checks">
                      <p style={{color:registerStrengthColor}}>{d.checkout.auth.passwordStrength}: {registerPasswordStrength}</p>
                      {registerPasswordChecks.map((rule) => (
                        <span key={rule.id} className={rule.valid ? 'is-valid' : ''}>
                          {rule.valid ? '✓' : '•'} {rule.label}
                        </span>
                      ))}
                    </div>
                    <label className="checkout-checkbox">
                      <input type="checkbox" checked={authNewsletterOptIn} onChange={(e) => setAuthNewsletterOptIn(e.target.checked)} />
                      {d.checkout.auth.newsletter}
                    </label>
                  </>
                )}
                <button type="submit" disabled={loading} className="checkout-secondary-submit">
                  {loading ? d.checkout.auth.loading : mode === 'login' ? d.checkout.auth.login : d.checkout.auth.createAccount}
                </button>
              </form>
              {mode === 'register' && pendingVerifyEmail && (
                <div className="checkout-verify-box">
                  <p>{d.checkout.auth.verificationLinkSentTo} <strong>{pendingVerifyEmail}</strong></p>
                  <p>{d.checkout.auth.verificationHelp}</p>
                  <button type="button" onClick={handleResendVerification} disabled={loading}>
                    {d.checkout.auth.resendLink}
                  </button>
                </div>
              )}
            </>
          )}

          {user && (
            <div className="checkout-alert success">
              {d.checkout.auth.signedInAs} {user.email}
            </div>
          )}

          <form id="checkout-details-form" name="checkout_details" autoComplete="on" className="checkout-onepage-form" onSubmit={e => e.preventDefault()}>
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <h1>{d.checkout.contact}</h1>
              </div>
              <FormField
                placeholder={d.checkout.email}
                fieldKey="email"
                type="email"
                value={form.email}
                error={errors.email}
                style={inputStyle('email')}
                disabled={checkoutLocked}
                onChange={e => { set('email', e.target.value); setErrors(err => ({...err, email: null})) }}
              />
              <FormField
                placeholder={d.checkout.phone}
                fieldKey="phone"
                type="tel"
                value={form.phone}
                error={errors.phone}
                style={inputStyle('phone')}
                disabled={checkoutLocked}
                onChange={e => { set('phone', e.target.value); setErrors(err => ({...err, phone: null})) }}
              />
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <h2>{d.checkout.delivery}</h2>
              </div>
              <div className="checkout-select-wrap">
                <select
                  value={form.country}
                  onChange={e => {
                    const nextCountry = e.target.value
                    setForm(f => ({
                      ...f,
                      country: nextCountry,
                      deliveryMethod: nextCountry === 'UA'
                        ? (f.country === 'UA' ? f.deliveryMethod : DELIVERY_METHOD_NOVA_POSHTA_BRANCH)
                        : DELIVERY_METHOD_ADDRESS,
                    }))
                    setErrors(err => ({...err, country: null}))
                  }}
                  name="country"
                  autoComplete="country"
                  disabled={checkoutLocked}
                >
                  {COUNTRIES.map(([code, name]) => (
                    <option key={code} value={code}>{countryName(code, name)}</option>
                  ))}
                </select>
              </div>
              {isUkraineDelivery && (
                <div className="checkout-delivery-methods" role="radiogroup" aria-label={d.checkout.deliveryMethod}>
                  {[
                    [DELIVERY_METHOD_NOVA_POSHTA_BRANCH, d.checkout.deliveryNovaPoshtaBranch, d.checkout.deliveryNovaPoshtaBranchHint],
                    [DELIVERY_METHOD_ADDRESS, d.checkout.deliveryAddress, d.checkout.deliveryAddressHint],
                  ].map(([method, label, hint]) => (
                    <button
                      key={method}
                      type="button"
                      disabled={checkoutLocked}
                      className={form.deliveryMethod === method ? 'is-active' : ''}
                      onClick={() => {
                        set('deliveryMethod', method)
                        setErrors(err => ({
                          ...err,
                          address: null,
                          city: null,
                          zip: null,
                          novaPoshtaCity: null,
                          novaPoshtaBranch: null,
                        }))
                      }}
                    >
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="checkout-2col">
                <FormField
                  placeholder={d.checkout.firstName}
                  fieldKey="firstName"
                  value={form.firstName}
                  error={errors.firstName}
                  style={inputStyle('firstName')}
                  disabled={checkoutLocked}
                  onChange={e => { set('firstName', e.target.value); setErrors(err => ({...err, firstName: null})) }}
                />
                <FormField
                  placeholder={d.checkout.lastName}
                  fieldKey="lastName"
                  value={form.lastName}
                  error={errors.lastName}
                  style={inputStyle('lastName')}
                  disabled={checkoutLocked}
                  onChange={e => { set('lastName', e.target.value); setErrors(err => ({...err, lastName: null})) }}
                />
              </div>
              {isNovaPoshtaBranchDelivery ? (
                <>
                  <div className="checkout-2col">
                    <FormField
                      placeholder={d.checkout.novaPoshtaCity}
                      fieldKey="novaPoshtaCity"
                      value={form.novaPoshtaCity}
                      error={errors.novaPoshtaCity}
                      style={inputStyle('novaPoshtaCity')}
                      disabled={checkoutLocked}
                      onChange={e => { set('novaPoshtaCity', e.target.value); setErrors(err => ({...err, novaPoshtaCity: null})) }}
                    />
                    <FormField
                      placeholder={d.checkout.novaPoshtaBranch}
                      fieldKey="novaPoshtaBranch"
                      value={form.novaPoshtaBranch}
                      error={errors.novaPoshtaBranch}
                      style={inputStyle('novaPoshtaBranch')}
                      disabled={checkoutLocked}
                      onChange={e => { set('novaPoshtaBranch', e.target.value); setErrors(err => ({...err, novaPoshtaBranch: null})) }}
                    />
                  </div>
                  <p className="checkout-delivery-help">{d.checkout.novaPoshtaBranchHelp}</p>
                </>
              ) : (
                <>
                  <FormField
                    placeholder={d.checkout.streetAddress}
                    fieldKey="address"
                    value={form.address}
                    error={errors.address}
                    style={inputStyle('address')}
                    disabled={checkoutLocked}
                    onChange={e => { set('address', e.target.value); setErrors(err => ({...err, address: null})) }}
                  />
                  <div className="checkout-2col">
                    <FormField
                      placeholder={d.checkout.zip}
                      fieldKey="zip"
                      value={form.zip}
                      error={errors.zip}
                      style={inputStyle('zip')}
                      disabled={checkoutLocked}
                      onChange={e => { set('zip', e.target.value); setErrors(err => ({...err, zip: null})) }}
                    />
                    <FormField
                      placeholder={d.checkout.city}
                      fieldKey="city"
                      value={form.city}
                      error={errors.city}
                      style={inputStyle('city')}
                      disabled={checkoutLocked}
                      onChange={e => { set('city', e.target.value); setErrors(err => ({...err, city: null})) }}
                    />
                  </div>
                </>
              )}
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <h2>{d.checkout.shipping}</h2>
              </div>
              <div className={shippingResult?.zone === 'unavailable' || shippingError ? 'checkout-shipping-method is-error' : 'checkout-shipping-method'}>
                <div>
                  <strong>{shippingLoading ? d.checkout.shippingCalculating : checkoutShippingLabel}</strong>
                  <span>
                    {!cart.length ? d.checkout.shippingNoCart :
                      shippingLoading ? d.checkout.shippingAddressPending :
                      shippingError ? shippingError :
                      shippingResult?.zone === 'unavailable' ? d.checkout.deliveryUnavailable :
                      shippingResult?.weight_kg ? `${shippingResult.weight_kg} kg` : d.checkout.shippingReady}
                  </span>
                </div>
                <strong>
                  {!cart.length ? '-' :
                    shippingLoading ? '...' :
                    shippingError ? '-' :
                    shippingResult?.zone === 'unavailable' ? d.checkout.notAvailable :
                    shippingResult?.price_eur != null
                      ? (shippingTotalDisplay === 0 ? d.confirm.free : formatPrice(shippingTotalDisplay, currency))
                      : '-'}
                </strong>
              </div>
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <h2>{d.checkout.payment}</h2>
                <p>{d.checkout.paymentSecure}</p>
              </div>
              <p className="checkout-payment-inline-note">{paymentRedirectCopy}</p>
              <button
                type="button"
                onClick={() => createCheckoutPaymentIntent()}
                disabled={paymentLoading || !cart.length || shippingLoading || !!shippingError || shippingResult?.zone === 'unavailable'}
                className="checkout-pay-button checkout-elements-pay-button"
              >
                {paymentLoading ? d.confirm.loading : d.confirm.payNow}
              </button>
            </section>

            {!checkoutLocked && (
              <>
                <section className="checkout-section">
                  <div className="checkout-section-heading">
                    <h2>{d.checkout.orderNote} <span>{d.checkout.optional}</span></h2>
                  </div>
                  <textarea
                    placeholder={d.checkout.orderNotePlaceholder}
                    value={form.comment}
                    onChange={e => set('comment', e.target.value)}
                    rows={3}
                  />
                </section>

                <div className="checkout-actions checkout-actions-single">
                  <button type="button" onClick={() => setDrawerOpen(true)} className="checkout-back-button">
                    {d.checkout.back}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <aside className="checkout-onepage-summary">
          <h2>{d.checkout.orderSummary}</h2>
          <div className="checkout-summary-items">
            {cart.map(item => (
              <div key={item.id+(item.size||'')} className="checkout-summary-item">
                <div className="checkout-summary-image">
                  {item.image_url && <img src={item.image_url} alt={buildItemImageAlt(item, locale)} />}
                  <span>{item.qty}</span>
                </div>
                <div>
                  <p>{item.name}</p>
                  <span>{item.size || d.checkout.noSize}</span>
                </div>
                <strong>{formatPrice(lineUnit(item) * item.qty, currency)}</strong>
              </div>
            ))}
          </div>

          <div className="checkout-promo-row">
            <input
              type="text"
              placeholder={d.confirm.enterPromo}
              value={promo}
              disabled={checkoutLocked}
              onChange={e => { setPromo(e.target.value); setPromoError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyPromo()
                }
              }}
            />
            <button type="button" onClick={() => applyPromo()} disabled={promoLoading || checkoutLocked}>
              {promoLoading ? d.confirm.checking : d.confirm.apply}
            </button>
          </div>
          {promoError && <p className="checkout-promo-error">{promoError}</p>}
          {promoApplied && (
            <div className="checkout-promo-applied">
              <span>
                {promoApplied.code} - {promoApplied.discount_type === 'percent'
                  ? `${promoApplied.discount_value}% ${d.confirm.percentOff}`
                  : promoApplied.discount_type === 'free_shipping'
                    ? d.confirm.freeShipping
                    : `${formatPrice(safeDiscount, currency)} ${d.confirm.euroOff}`}
              </span>
              <button type="button" onClick={() => { setPromoApplied(null); setPromo('') }} disabled={checkoutLocked}>x</button>
            </div>
          )}

          <div className="checkout-summary-totals">
            <div><span>{d.checkout.subtotal}</span><span>{formatPrice(displayTotal, currency)}</span></div>
            {promoApplied && safeDiscount > 0 && (
              <div className="is-discount"><span>{d.confirm.discount}</span><span>-{formatPrice(safeDiscount, currency)}</span></div>
            )}
            <div>
              <span>{d.checkout.shipping}</span>
              <span>
                {!cart.length ? '-' :
                  shippingLoading ? '...' :
                  shippingError ? '-' :
                  shippingResult?.zone === 'unavailable' ? d.checkout.notAvailable :
                  shippingResult?.price_eur != null
                    ? (shippingTotalDisplay === 0 ? d.confirm.free : formatPrice(shippingTotalDisplay, currency))
                    : '-'}
              </span>
            </div>
            <div className="is-total"><span>{d.confirm.total}</span><span>{formatPrice(finalTotal, currency)}</span></div>
          </div>

          <p className="checkout-summary-note">{d.checkout.summaryNote}</p>
        </aside>
      </div>
    </main>
  )
}

export default function CheckoutPageWrapper({ locale = 'en' }) {
  return (
    <Suspense>
      <CheckoutPage locale={locale} />
    </Suspense>
  )
}
