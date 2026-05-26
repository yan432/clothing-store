'use client'
export const dynamic = 'force-dynamic'
import { useCart } from '../context/CartContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../lib/api'
import { trackPaymentInfo } from '../lib/track'
import { getStoredMetaAttribution, getStoredUtm } from '../components/UtmCapture'
import { getMessages, pathForLocale } from '../lib/i18n'

const DEFAULT_SHIPPING = 30
const DEFAULT_THRESHOLD = 120

function StepBar({ locale = 'en' }) {
  const d = getMessages(locale)
  const steps = [
    { n: 1, label: d.checkout.steps[0], done: true, href: pathForLocale('/cart', locale) },
    { n: 2, label: d.checkout.steps[1], done: true, href: pathForLocale('/checkout', locale) },
    { n: 3, label: d.checkout.steps[2], active: true },
    { n: 4, label: d.checkout.steps[3], disabled: true },
  ]
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

export default function ConfirmPage({ locale = 'en' }) {
  const d = getMessages(locale)
  const { cart, total } = useCart()
  const router = useRouter()
  const [details, setDetails] = useState(null)
  const [promo, setPromo] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shippingCost, setShippingCost] = useState(DEFAULT_SHIPPING)
  const [freeThreshold, setFreeThreshold] = useState(DEFAULT_THRESHOLD)
  const paymentTracked = useRef(false)
  const regionNames = useMemo(() => {
    try { return new Intl.DisplayNames([locale === 'uk' ? 'uk' : 'en'], { type: 'region' }) }
    catch { return null }
  }, [locale])

  useEffect(() => {
    const saved = sessionStorage.getItem('checkout_details')
    if (!saved) { router.push(pathForLocale('/checkout', locale)); return }
    const parsed = JSON.parse(saved)
    setDetails(parsed)

    // Restore pre-calculated shipping from checkout page
    const savedShipping = sessionStorage.getItem('checkout_shipping')
    if (savedShipping) {
      try {
        const ship = JSON.parse(savedShipping)
        if (ship?.price_eur != null) setShippingCost(ship.price_eur)
      } catch {}
    }
  }, [locale, router])

  useEffect(() => {
    // Recalculate shipping if cart or country changes
    if (!cart.length || !details?.country) return
    fetch(getApiUrl('/shipping/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: details.country,
        items: cart.map(item => ({ id: item.id, quantity: item.qty, volumetric_weight: item.volumetric_weight })),
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.price_eur != null) setShippingCost(d.price_eur) })
      .catch(() => {})

    fetch(getApiUrl('/settings'))
      .then(r => r.ok ? r.json() : {})
      .then(s => {
        const threshold = parseFloat(s.shipping_free_threshold || DEFAULT_THRESHOLD)
        setFreeThreshold(threshold)
      })
      .catch(() => {})
  }, [details?.country, cart])

  if (!details || cart.length === 0) return null

  const discount = promoApplied ? Number(promoApplied.discount_amount || 0) : 0
  const safeDiscount = Math.min(total + shippingCost, Math.max(0, discount))
  const qualifiesFreeShipping = total >= freeThreshold
  const shippingTotal = (promoApplied?.discount_type === 'free_shipping' || qualifiesFreeShipping) ? 0 : shippingCost
  const finalTotal = total - safeDiscount + shippingTotal

  async function applyPromo() {
    const code = promo.trim().toUpperCase()
    if (!code) {
      setPromoError(d.confirm.enterPromoError)
      return
    }
    setPromoLoading(true)
    try {
      const res = await fetch(`${getApiUrl('/promo-codes/validate')}?code=${encodeURIComponent(code)}&subtotal=${encodeURIComponent(String(total))}&shipping=${encodeURIComponent(String(shippingCost))}`)
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
      setPromoError('')
    } catch {
      setPromoError(d.confirm.failedPromo)
      setPromoApplied(null)
    } finally {
      setPromoLoading(false)
    }
  }

  async function handlePay() {
    if (!paymentTracked.current) {
      paymentTracked.current = true
      trackPaymentInfo({
        email: details.email,
        cart,
        value: finalTotal,
        paymentType: 'Stripe',
      })
    }
    setLoading(true)
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
          customer_email: details.email,
          first_name: details.firstName,
          last_name: details.lastName,
          phone: details.phone,
          address: details.address,
          city: details.city,
          zip: details.zip,
          country: details.country,
          promo_code: promoApplied?.code || null,
          comment: details.comment || null,
          preferred_locale: locale,
          success_url: `${origin}${pathForLocale('/success', locale)}`,
          cancel_url: `${origin}${pathForLocale('/cart', locale)}`,
          utm: getStoredUtm() || undefined,
          meta: getStoredMetaAttribution() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        // Save order snapshot for GA4 purchase event on /success
        try {
          localStorage.setItem('pending_order', JSON.stringify({
            order_id: data.order_id || data.id,
            total: finalTotal,
            items: cart.map(item => ({
              product_id: item.id,
              slug: item.slug || null,
              name: item.name,
              price: parseFloat(item.price),
              quantity: item.qty,
              size: item.size || null,
              category: item.category || null,
            })),
          }))
        } catch (_) {}
        window.location.href = data.url
        return // keep loading spinner while Stripe redirects
      }
      // Backend returned an error (e.g. out of stock, promo expired)
      const requestId = data.request_id || data.detail?.request_id || null
      alert(`${d.confirm.checkoutFailed}${requestId ? ` ${d.confirm.reference}: ${requestId}` : ''}`)
      setLoading(false)
    } catch {
      alert(d.confirm.checkoutFailed)
      setLoading(false)
    }
  }

  const COUNTRY_NAMES = {
    'DE':'Germany','AT':'Austria','CH':'Switzerland','US':'United States',
    'GB':'United Kingdom','FR':'France','NL':'Netherlands','PL':'Poland',
    'IT':'Italy','ES':'Spain','UA':'Ukraine',
  }

  return (
    <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
      <StepBar locale={locale} />

      <div className="checkout-layout">
        <div>
          <h1 style={{fontSize:24,fontWeight:600,margin:'0 0 28px'}}>{d.confirm.review}</h1>

          {/* Items */}
          <div style={{marginBottom:28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 14px'}}>{d.confirm.items}</p>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {cart.map(item => (
                <div key={item.id+(item.size||'')} style={{display:'flex',gap:14,alignItems:'center',background:'#fff',border:'1px solid #f0f0ee',borderRadius:14,padding:14}}>
                  <div style={{width:72,height:72,borderRadius:8,overflow:'hidden',background:'#f5f5f3',flexShrink:0}}>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:600,fontSize:14,margin:'0 0 2px'}}>{item.name}</p>
                    {item.size && <p style={{fontSize:12,color:'#888',margin:'0 0 2px'}}>{d.confirm.size}: {item.size}</p>}
                    <p style={{fontSize:12,color:'#aaa',margin:0}}>{d.confirm.qty}: {item.qty}</p>
                  </div>
                  <p style={{fontSize:14,fontWeight:600,margin:0}}>€{(item.price * item.qty).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping address */}
          <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:14,padding:20,marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 10px'}}>{d.confirm.shippingAddress}</p>
                <p style={{fontSize:14,fontWeight:500,margin:'0 0 2px'}}>{details.firstName} {details.lastName}</p>
                <p style={{fontSize:14,color:'#555',margin:'0 0 2px'}}>{details.address}</p>
                <p style={{fontSize:14,color:'#555',margin:'0 0 2px'}}>{details.zip} {details.city}</p>
                <p style={{fontSize:14,color:'#555',margin:0}}>{regionNames?.of(details.country) || COUNTRY_NAMES[details.country] || details.country}</p>
              </div>
              <button onClick={() => { sessionStorage.setItem('_from_confirm', '1'); router.push(pathForLocale('/checkout', locale)) }}
                style={{fontSize:13,color:'#555',background:'none',border:'1px solid #e5e5e3',borderRadius:8,padding:'6px 14px',cursor:'pointer'}}>
                {d.confirm.edit}
              </button>
            </div>
          </div>

          {/* Contact */}
          <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:14,padding:20,marginBottom:details.comment ? 16 : 28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 10px'}}>{d.confirm.contact}</p>
            <p style={{fontSize:14,color:'#555',margin:'0 0 4px'}}>{details.email}</p>
            <p style={{fontSize:14,color:'#555',margin:0}}>{details.phone}</p>
          </div>

          {/* Order note */}
          {details.comment && (
            <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:14,padding:20,marginBottom:28}}>
              <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 10px'}}>{d.confirm.orderNote}</p>
              <p style={{fontSize:14,color:'#555',margin:0,whiteSpace:'pre-wrap',lineHeight:1.6}}>{details.comment}</p>
            </div>
          )}

          {/* Promo code */}
          <div style={{marginBottom:28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 12px'}}>{d.confirm.promoCode}</p>
            <div style={{display:'flex',gap:8}}>
              <input type="text" placeholder={d.confirm.enterPromo} value={promo}
                onChange={e => { setPromo(e.target.value); setPromoError('') }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                style={{flex:1,padding:'12px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:16,outline:'none',background:'#fff'}}/>
              <button onClick={applyPromo}
                disabled={promoLoading}
                style={{padding:'12px 20px',borderRadius:12,border:'1.5px solid #000',background:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',opacity:promoLoading ? 0.7 : 1}}>
                {promoLoading ? d.confirm.checking : d.confirm.apply}
              </button>
            </div>
            {promoError && <p style={{fontSize:12,color:'#ef4444',margin:'6px 0 0'}}>{promoError}</p>}
            {promoApplied && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'8px 14px'}}>
                <span style={{fontSize:13,color:'#166534',fontWeight:500}}>
                  {promoApplied.code} — {promoApplied.discount_type === 'percent'
                    ? `${promoApplied.discount_value}% ${d.confirm.percentOff}`
                    : promoApplied.discount_type === 'free_shipping'
                      ? d.confirm.freeShipping
                      : `€${Number(promoApplied.discount_value || 0).toFixed(2)} ${d.confirm.euroOff}`}
                </span>
                <button onClick={() => { setPromoApplied(null); setPromo('') }}
                  style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:18,padding:0}}>×</button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => { sessionStorage.setItem('_from_confirm', '1'); router.push(pathForLocale('/checkout', locale)) }}
              style={{background:'none',border:'1.5px solid #e5e5e3',padding:'15px 24px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer',color:'#555'}}>
              {d.confirm.back}
            </button>
            <button onClick={handlePay} disabled={loading}
              style={{background:'#000',color:'#fff',border:'none',padding:'16px 40px',borderRadius:999,fontSize:14,fontWeight:600,cursor:'pointer',opacity:loading?0.6:1}}>
              {loading ? d.confirm.loading : d.confirm.payNow}
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="checkout-sidebar" style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:20,padding:24,position:'sticky',top:100}}>
          <h2 style={{fontSize:20,fontWeight:700,margin:'0 0 20px'}}>{d.confirm.orderSummary}</h2>
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
            {cart.map(item => (
              <div key={item.id+(item.size||'')} style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:48,height:48,borderRadius:8,overflow:'hidden',background:'#eee',flexShrink:0}}>
                  {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:500,margin:'0 0 1px'}}>{item.name}</p>
                  <p style={{fontSize:11,color:'#aaa',margin:0}}>x{item.qty}{item.size ? ` • ${item.size}` : ''}</p>
                </div>
                <p style={{fontSize:13,fontWeight:500,margin:0}}>€{(item.price*item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid #e5e5e3',paddingTop:16,display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
              <span>{d.confirm.subtotal}</span><span>€{total.toFixed(2)}</span>
            </div>
            {promoApplied && (
              <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#16a34a'}}>
                <span>
                  {d.confirm.discount} ({promoApplied.discount_type === 'percent'
                    ? `${promoApplied.discount_value}%`
                    : promoApplied.discount_type === 'free_shipping'
                      ? d.confirm.freeShipping
                      : `€${Number(promoApplied.discount_value || 0).toFixed(2)}`})
                </span>
                <span>−€{safeDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
              <span>{d.confirm.shipping}</span>
              <span style={shippingTotal === 0 ? {color:'#16a34a',fontWeight:500} : {}}>
                {shippingTotal === 0 ? d.confirm.free : `€${shippingTotal.toFixed(2)}`}
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,marginTop:4,paddingTop:10,borderTop:'1px solid #e5e5e3'}}>
              <span>{d.confirm.total}</span><span>€{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <p style={{fontSize:11,color:'#bbb',textAlign:'center',marginTop:16,lineHeight:1.5}}>
            {d.confirm.stripe}
          </p>
        </div>
      </div>
    </main>
  )
}
