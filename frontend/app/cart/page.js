'use client'
import { useCart } from '../context/CartContext'
import { useState } from 'react'
import { getApiUrl } from '../lib/api'

export default function CartPage() {
  const { cart, removeFromCart, updateQty, total, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const [checkoutMode, setCheckoutMode] = useState('guest')
  const [promoCode, setPromoCode] = useState('')
  const [details, setDetails] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    city: '',
    address: '',
    apartment: '',
    postalCode: '',
  })

  function lineKeyOf(item) {
    return item.lineKey || `${item.id}:${item.size || 'no-size'}`
  }

  function dec(item) {
    updateQty(lineKeyOf(item), item.qty - 1)
  }

  function inc(item) {
    updateQty(lineKeyOf(item), item.qty + 1)
  }

  async function handleCheckout() {
    setLoading(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
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
          success_url: origin + '/success',
          cancel_url: origin + '/cart',
        }),
      })
      const data = await res.json()
      console.log('Checkout response:', data)
      if (data.url) window.location.href = data.url
      else alert('Error: ' + JSON.stringify(data))
    } catch (e) {
      console.error('Checkout error:', e)
      alert('Something went wrong: ' + e.message)
    }
    setLoading(false)
  }

  if (cart.length === 0) return (
    <main style={{maxWidth:600,margin:'0 auto',padding:'80px 24px',textAlign:'center'}}>
      <p style={{fontSize:18,color:'#aaa',marginBottom:24}}>Your cart is empty</p>
      <a href="/products" style={{background:'#000',color:'#fff',padding:'12px 28px',borderRadius:999,fontSize:14,textDecoration:'none'}}>
        Shop Now
      </a>
    </main>
  )

  const subtotal = total
  const shippingLabel = 'Calculated at checkout'
  const steps = [
    { id: 1, label: 'Cart' },
    { id: 2, label: 'Details', note: 'Login optional' },
    { id: 3, label: 'Shipping' },
    { id: 4, label: 'Payment' },
  ]
  
  function setDetail(field, value) {
    setDetails((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <main style={{maxWidth:1240,margin:'0 auto',padding:'40px 24px 64px'}}>
      <a href="/" style={{display:'inline-block',fontSize:34,fontWeight:600,marginBottom:28,textDecoration:'underline'}}>edm.clothes</a>

      <h1 style={{fontSize:44,lineHeight:1.05,fontWeight:600,margin:'0 0 18px'}}>Checkout</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:8,marginBottom:26,maxWidth:860}}>
        {steps.map((step, index) => {
          const isDone = step.id < activeStep
          const isActive = step.id === activeStep
          const isPending = step.id > activeStep
          return (
            <div key={step.id} style={{position:'relative',paddingTop:4}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{
                  width:30,
                  height:30,
                  borderRadius:'50%',
                  border:'1px solid ' + (isActive || isDone ? '#111' : '#d3d3cc'),
                  background:isActive ? '#111' : (isDone ? '#fff' : '#f5f5f2'),
                  color:isActive ? '#fff' : '#111',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  fontSize:13,
                  fontWeight:600,
                }}>
                  {isDone ? '✓' : step.id}
                </div>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:14,fontWeight:isActive ? 700 : 500,color:isPending ? '#777' : '#111'}}>
                    {step.label}
                  </p>
                  {step.note ? (
                    <p style={{margin:'2px 0 0',fontSize:11,color:'#888'}}>{step.note}</p>
                  ) : null}
                </div>
              </div>
              <div style={{
                height:2,
                borderRadius:999,
                background:isDone || isActive ? '#111' : '#d7d7d1',
                opacity:isPending ? 0.7 : 1,
              }} />
              {index === steps.length - 1 ? null : (
                <div style={{
                  position:'absolute',
                  right:-6,
                  top:42,
                  width:12,
                  textAlign:'center',
                  color:'#c8c8c2',
                  fontSize:10,
                }}>•</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))',gap:24,alignItems:'start'}}>
        <section style={{border:'1px solid #ecece6',borderRadius:18,padding:18,background:'#fff'}}>
          {activeStep === 1 && (
            <>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:16}}>
                <h2 style={{fontSize:28,fontWeight:600,margin:0}}>Cart</h2>
                <button type="button" onClick={clearCart} style={{fontSize:13,color:'#85857f',background:'none',border:'none',cursor:'pointer'}}>
                  Clear all
                </button>
              </div>

              <div style={{display:'grid',gap:12}}>
                {cart.map(item => (
                  <article key={item.lineKey || item.id} style={{display:'grid',gridTemplateColumns:'72px 1fr auto',gap:12,alignItems:'center',border:'1px solid #f1f1ed',borderRadius:14,padding:12}}>
                    <div style={{width:72,height:90,borderRadius:10,overflow:'hidden',background:'#f5f5f3'}}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ccc'}}>No image</div>
                      }
                    </div>
                    <div style={{minWidth:0}}>
                      <p style={{fontWeight:600,fontSize:15,margin:'0 0 4px'}}>{item.name}</p>
                      {item.size && <p style={{fontSize:12,color:'#666660',margin:'0 0 4px'}}>Size: {item.size}</p>}
                      <p style={{fontSize:13,color:'#888883',margin:'0 0 8px'}}>${Number(item.price || 0).toFixed(2)}</p>
                      <div style={{display:'inline-flex',alignItems:'center',gap:10,border:'1px solid #e4e4de',borderRadius:999,padding:'4px 8px'}}>
                        <button
                          type="button"
                          onClick={() => dec(item)}
                          style={{width:30,height:30,borderRadius:'50%',border:'1px solid #dcdcd7',background:'#fff',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}
                        >
                          −
                        </button>
                        <span style={{fontSize:14,fontWeight:500,minWidth:18,textAlign:'center'}}>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => inc(item)}
                          style={{width:30,height:30,borderRadius:'50%',border:'1px solid #dcdcd7',background:'#fff',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{textAlign:'right',display:'grid',justifyItems:'end',gap:8}}>
                      <p style={{fontSize:15,fontWeight:600,margin:0}}>${(Number(item.price || 0) * item.qty).toFixed(2)}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(lineKeyOf(item))}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:13,padding:0,textDecoration:'underline'}}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                style={{marginTop:16,background:'#111',color:'#fff',border:'none',borderRadius:999,padding:'12px 18px',fontSize:14,fontWeight:600,cursor:'pointer'}}
              >
                Continue to details
              </button>
            </>
          )}

          {activeStep === 2 && (
            <>
              <h2 style={{fontSize:28,fontWeight:600,margin:'0 0 14px'}}>Details</h2>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
                {[
                  { id: 'login', label: 'Login' },
                  { id: 'create', label: 'Create account' },
                  { id: 'guest', label: 'Continue as guest' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setCheckoutMode(mode.id)}
                    style={{
                      border:'1px solid ' + (checkoutMode === mode.id ? '#111' : '#d7d7d1'),
                      background:checkoutMode === mode.id ? '#111' : '#fff',
                      color:checkoutMode === mode.id ? '#fff' : '#222',
                      borderRadius:999,
                      padding:'8px 12px',
                      fontSize:13,
                      cursor:'pointer',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p style={{fontSize:12,color:'#7a7a74',margin:'0 0 12px'}}>
                {checkoutMode === 'guest' ? 'No account required. Fill the fields below and continue.' : 'Auth flow will be connected next. For now you can continue and place order as guest.'}
              </p>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <input placeholder="Email address" value={details.email} onChange={(e) => setDetail('email', e.target.value)} style={{gridColumn:'1 / -1',border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="First name" value={details.firstName} onChange={(e) => setDetail('firstName', e.target.value)} style={{border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="Last name" value={details.lastName} onChange={(e) => setDetail('lastName', e.target.value)} style={{border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="Phone number" value={details.phone} onChange={(e) => setDetail('phone', e.target.value)} style={{gridColumn:'1 / -1',border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="Country" value={details.country} onChange={(e) => setDetail('country', e.target.value)} style={{border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="City" value={details.city} onChange={(e) => setDetail('city', e.target.value)} style={{border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="Address" value={details.address} onChange={(e) => setDetail('address', e.target.value)} style={{gridColumn:'1 / -1',border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="Apartment / suite (optional)" value={details.apartment} onChange={(e) => setDetail('apartment', e.target.value)} style={{border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <input placeholder="Postal code" value={details.postalCode} onChange={(e) => setDetail('postalCode', e.target.value)} style={{border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
              </div>

              <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr auto',gap:8}}>
                <input placeholder="Promo code (coming soon)" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} style={{border:'1px solid #ddd',borderRadius:10,padding:'11px 12px',fontSize:14}} />
                <button type="button" disabled style={{border:'1px solid #ddd',background:'#f7f7f5',borderRadius:10,padding:'11px 14px',fontSize:13,color:'#888'}}>Apply</button>
              </div>

              <div style={{display:'flex',gap:8,marginTop:14}}>
                <button type="button" onClick={() => setActiveStep(1)} style={{border:'1px solid #ddd',background:'#fff',borderRadius:999,padding:'10px 14px',fontSize:13,cursor:'pointer'}}>Back</button>
                <button type="button" onClick={() => setActiveStep(3)} style={{border:'none',background:'#111',color:'#fff',borderRadius:999,padding:'10px 16px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Next: shipping</button>
              </div>
            </>
          )}

          {activeStep === 3 && (
            <>
              <h2 style={{fontSize:28,fontWeight:600,margin:'0 0 10px'}}>Shipping</h2>
              <p style={{fontSize:14,color:'#666660',margin:'0 0 14px'}}>
                Shipping methods and live shipping cost calculation will be added next.
              </p>
              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={() => setActiveStep(2)} style={{border:'1px solid #ddd',background:'#fff',borderRadius:999,padding:'10px 14px',fontSize:13,cursor:'pointer'}}>Back</button>
                <button type="button" onClick={() => setActiveStep(4)} style={{border:'none',background:'#111',color:'#fff',borderRadius:999,padding:'10px 16px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Continue to payment</button>
              </div>
            </>
          )}

          {activeStep === 4 && (
            <>
              <h2 style={{fontSize:28,fontWeight:600,margin:'0 0 10px'}}>Payment</h2>
              <p style={{fontSize:14,color:'#666660',margin:'0 0 12px'}}>
                Click the button in Order summary to continue to secure Stripe checkout.
              </p>
              <button type="button" onClick={() => setActiveStep(3)} style={{border:'1px solid #ddd',background:'#fff',borderRadius:999,padding:'10px 14px',fontSize:13,cursor:'pointer'}}>Back to shipping</button>
            </>
          )}
        </section>

        <aside style={{border:'1px solid #d6d6d0',borderRadius:18,padding:20,background:'#fdfdfc',position:'sticky',top:90}}>
          <h2 style={{fontSize:36,fontWeight:600,margin:'0 0 16px'}}>Order summary</h2>
          <div style={{display:'grid',gap:10,marginBottom:16}}>
            {cart.map(item => (
              <div key={lineKeyOf(item)} style={{display:'grid',gridTemplateColumns:'40px 1fr auto',gap:10,alignItems:'center'}}>
                <div style={{width:40,height:52,borderRadius:8,overflow:'hidden',background:'#efefea'}}>
                  {item.image_url ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : null}
                </div>
                <div style={{minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</p>
                  <p style={{fontSize:12,color:'#7b7b74',margin:0}}>x{item.qty}{item.size ? ` • ${item.size}` : ''}</p>
                </div>
                <p style={{fontSize:13,fontWeight:600,margin:0}}>${(Number(item.price || 0) * item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid #dfdfd8',paddingTop:14,display:'grid',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14}}>
              <span>Subtotal</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#6f6f68'}}>
              <span>Shipping</span>
              <span>{shippingLabel}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,paddingTop:8,borderTop:'1px solid #ecece6'}}>
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading || activeStep !== 4}
            style={{marginTop:18,width:'100%',background:'#000',color:'#fff',border:'none',padding:'16px 20px',borderRadius:999,fontSize:16,fontWeight:600,cursor:'pointer',opacity:loading ? 0.7 : 1}}
          >
            {loading ? 'Redirecting...' : (activeStep === 4 ? 'Proceed to payment' : 'Complete previous steps')}
          </button>
          <p style={{fontSize:12,color:'#7a7a74',margin:'10px 0 0'}}>Shipping address and payment details are entered securely on Stripe checkout.</p>
        </aside>
      </div>
    </main>
  )
}