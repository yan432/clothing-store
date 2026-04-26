'use client'
import { useCart } from '../context/CartContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../lib/api'
import { trackCheckoutStarted } from '../lib/track'

const SHIPPING = 30

const steps = [
  { n: 1, label: 'Cart', done: true, href: '/cart' },
  { n: 2, label: 'Details', done: true, href: '/checkout' },
  { n: 3, label: 'Confirm', active: true },
  { n: 4, label: 'Payment', disabled: true },
]

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
                <p style={{fontSize:13,fontWeight:s.active?600:400,color:s.disabled?'#ccc':s.active?'#000':'#555',margin:0,cursor:'pointer'}}>
                  {s.label}
                </p>
              </a>
            ) : (
              <p style={{fontSize:13,fontWeight:s.active?600:400,color:s.disabled?'#ccc':s.active?'#000':'#555',margin:0}}>
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

export default function ConfirmPage() {
  const { cart, total } = useCart()
  const router = useRouter()
  const [details, setDetails] = useState(null)
  const [promo, setPromo] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('checkout_details')
    if (!saved) { router.push('/checkout'); return }
    const parsed = JSON.parse(saved)
    setDetails(parsed)
    trackCheckoutStarted(parsed.email || null)
  }, [])

  if (!details || cart.length === 0) return null

  const discount = promoApplied ? Number(promoApplied.discount_amount || 0) : 0
  const safeDiscount = Math.min(total + SHIPPING, Math.max(0, discount))
  const shippingTotal = promoApplied?.discount_type === 'free_shipping' ? 0 : SHIPPING
  const finalTotal = total - safeDiscount + shippingTotal

  async function applyPromo() {
    const code = promo.trim().toUpperCase()
    if (!code) {
      setPromoError('Enter promo code')
      return
    }
    setPromoLoading(true)
    try {
      const res = await fetch(`${getApiUrl('/promo-codes/validate')}?code=${encodeURIComponent(code)}&subtotal=${encodeURIComponent(String(total))}&shipping=${encodeURIComponent(String(SHIPPING))}`)
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setPromoError(data?.message || 'Invalid promo code')
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
      setPromoError('Failed to validate promo code')
      setPromoApplied(null)
    } finally {
      setPromoLoading(false)
    }
  }

  async function handlePay() {
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
          success_url: `${origin}/success`,
          cancel_url: `${origin}/cart`,
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

  const COUNTRY_NAMES = {
    'DE':'Germany','AT':'Austria','CH':'Switzerland','US':'United States',
    'GB':'United Kingdom','FR':'France','NL':'Netherlands','PL':'Poland',
    'IT':'Italy','ES':'Spain','UA':'Ukraine',
  }

  return (
    <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
      <StepBar />

      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:32,alignItems:'start'}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:600,margin:'0 0 28px'}}>Review your order</h1>

          {/* Items */}
          <div style={{marginBottom:28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 14px'}}>Items</p>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {cart.map(item => (
                <div key={item.id+(item.size||'')} style={{display:'flex',gap:14,alignItems:'center',background:'#fff',border:'1px solid #f0f0ee',borderRadius:14,padding:14}}>
                  <div style={{width:72,height:72,borderRadius:8,overflow:'hidden',background:'#f5f5f3',flexShrink:0}}>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:600,fontSize:14,margin:'0 0 2px'}}>{item.name}</p>
                    {item.size && <p style={{fontSize:12,color:'#888',margin:'0 0 2px'}}>Size: {item.size}</p>}
                    <p style={{fontSize:12,color:'#aaa',margin:0}}>Qty: {item.qty}</p>
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
                <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 10px'}}>Shipping address</p>
                <p style={{fontSize:14,fontWeight:500,margin:'0 0 2px'}}>{details.firstName} {details.lastName}</p>
                <p style={{fontSize:14,color:'#555',margin:'0 0 2px'}}>{details.address}</p>
                <p style={{fontSize:14,color:'#555',margin:'0 0 2px'}}>{details.zip} {details.city}</p>
                <p style={{fontSize:14,color:'#555',margin:0}}>{COUNTRY_NAMES[details.country] || details.country}</p>
              </div>
              <button onClick={() => { sessionStorage.setItem('_from_confirm', '1'); router.push('/checkout') }}
                style={{fontSize:13,color:'#555',background:'none',border:'1px solid #e5e5e3',borderRadius:8,padding:'6px 14px',cursor:'pointer'}}>
                Edit
              </button>
            </div>
          </div>

          {/* Contact */}
          <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:14,padding:20,marginBottom:details.comment ? 16 : 28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 10px'}}>Contact</p>
            <p style={{fontSize:14,color:'#555',margin:'0 0 4px'}}>{details.email}</p>
            <p style={{fontSize:14,color:'#555',margin:0}}>{details.phone}</p>
          </div>

          {/* Order note */}
          {details.comment && (
            <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:14,padding:20,marginBottom:28}}>
              <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 10px'}}>Order note</p>
              <p style={{fontSize:14,color:'#555',margin:0,whiteSpace:'pre-wrap',lineHeight:1.6}}>{details.comment}</p>
            </div>
          )}

          {/* Promo code */}
          <div style={{marginBottom:28}}>
            <p style={{fontSize:12,fontWeight:600,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 12px'}}>Promo code</p>
            <div style={{display:'flex',gap:8}}>
              <input type="text" placeholder="Enter promo code" value={promo}
                onChange={e => { setPromo(e.target.value); setPromoError('') }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                style={{flex:1,padding:'12px 16px',borderRadius:12,border:'1px solid #e5e5e3',fontSize:14,outline:'none',background:'#fff'}}/>
              <button onClick={applyPromo}
                disabled={promoLoading}
                style={{padding:'12px 20px',borderRadius:12,border:'1.5px solid #000',background:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',opacity:promoLoading ? 0.7 : 1}}>
                {promoLoading ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {promoError && <p style={{fontSize:12,color:'#ef4444',margin:'6px 0 0'}}>{promoError}</p>}
            {promoApplied && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'8px 14px'}}>
                <span style={{fontSize:13,color:'#166534',fontWeight:500}}>
                  {promoApplied.code} — {promoApplied.discount_type === 'percent'
                    ? `${promoApplied.discount_value}% off`
                    : promoApplied.discount_type === 'free_shipping'
                      ? 'Free shipping'
                      : `€${Number(promoApplied.discount_value || 0).toFixed(2)} off`}
                </span>
                <button onClick={() => { setPromoApplied(null); setPromo('') }}
                  style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:18,padding:0}}>×</button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{display:'flex',gap:12}}>
            <button onClick={() => { sessionStorage.setItem('_from_confirm', '1'); router.push('/checkout') }}
              style={{background:'none',border:'1.5px solid #e5e5e3',padding:'15px 24px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer',color:'#555'}}>
              ← Back
            </button>
            <button onClick={handlePay} disabled={loading}
              style={{background:'#000',color:'#fff',border:'none',padding:'16px 40px',borderRadius:999,fontSize:14,fontWeight:600,cursor:'pointer',opacity:loading?0.6:1}}>
              {loading ? 'Loading...' : 'Pay now →'}
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:20,padding:24,position:'sticky',top:100}}>
          <h2 style={{fontSize:20,fontWeight:700,margin:'0 0 20px'}}>Order summary</h2>
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
              <span>Subtotal</span><span>€{total.toFixed(2)}</span>
            </div>
            {promoApplied && (
              <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#16a34a'}}>
                <span>
                  Discount ({promoApplied.discount_type === 'percent'
                    ? `${promoApplied.discount_value}%`
                    : promoApplied.discount_type === 'free_shipping'
                      ? 'Free shipping'
                      : `€${Number(promoApplied.discount_value || 0).toFixed(2)}`})
                </span>
                <span>−€{safeDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
              <span>Shipping</span><span>€{shippingTotal.toFixed(2)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,marginTop:4,paddingTop:10,borderTop:'1px solid #e5e5e3'}}>
              <span>Total</span><span>€{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <p style={{fontSize:11,color:'#bbb',textAlign:'center',marginTop:16,lineHeight:1.5}}>
            Payment is processed securely via Stripe.
          </p>
        </div>
      </div>
    </main>
  )
}