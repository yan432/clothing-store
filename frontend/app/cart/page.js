'use client'
import { useCart } from '../context/CartContext'

const steps = [
  { n: 1, label: 'Cart', active: true },
  { n: 2, label: 'Details', active: false },
  { n: 3, label: 'Confirm', disabled: true },
  { n: 4, label: 'Payment', disabled: true },
]

export default function CartPage() {
  const { cart, removeFromCart, updateQty, total, clearCart } = useCart()

  return (
    <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
      <div style={{display:'flex',alignItems:'center',marginBottom:40}}>
        {steps.map((s, i) => (
          <div key={s.n} style={{display:'flex',alignItems:'center',flex: i < steps.length - 1 ? 1 : 'none'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{
                width:32,height:32,borderRadius:'50%',
                background: s.active ? '#000' : 'transparent',
                border: s.active ? 'none' : '1.5px solid #ccc',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:13,fontWeight:500,
                color: s.active ? '#fff' : s.disabled ? '#ccc' : '#888',
              }}>{s.n}</div>
              <p style={{fontSize:13,fontWeight:s.active?600:400,color:s.disabled?'#ccc':s.active?'#000':'#555',margin:0}}>{s.label}</p>
            </div>
            {i < steps.length - 1 && (
              <div style={{flex:1,height:1,background:'#e5e5e3',margin:'0 8px',marginBottom:20}}/>
            )}
          </div>
        ))}
      </div>

      {cart.length === 0 ? (
        <div style={{textAlign:'center',padding:'80px 0'}}>
          <p style={{fontSize:18,color:'#aaa',marginBottom:24}}>Your cart is empty</p>
          <a href="/products" style={{background:'#000',color:'#fff',padding:'12px 28px',borderRadius:999,fontSize:14,textDecoration:'none'}}>
            Shop Now
          </a>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:32,alignItems:'start'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h1 style={{fontSize:24,fontWeight:600,margin:0}}>Cart</h1>
              <button onClick={clearCart} style={{fontSize:13,color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>
                Clear all
              </button>
            </div>

            <div style={{marginBottom:24}}>
              <p style={{fontSize:12,color:'#aaa',textAlign:'center',marginBottom:12}}>Quick checkout</p>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => alert('Apple Pay coming soon')}
                  style={{flex:1,background:'#000',color:'#fff',border:'none',padding:'13px',borderRadius:12,fontSize:14,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Apple Pay
                </button>
                <button onClick={() => alert('PayPal coming soon')}
                  style={{flex:1,background:'#003087',color:'#fff',border:'none',padding:'13px',borderRadius:12,fontSize:14,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.315 2.642 1.04 4.73-.315 2.386-1.167 4.006-2.53 4.823-1.22.737-2.808.908-4.148.908h-2.17L11.027 15.93l-.22 1.248-3.731 4.16zm12.585-9.199c-.115.607-.29 1.146-.534 1.613-.805 1.553-2.302 2.341-4.45 2.341H12.62a.67.67 0 0 0-.663.57l-1.137 7.198H7.076l3.655-4.073 3.6-20.41h3.5c1.358 0 2.322.298 2.875.891.56.6.746 1.544.572 2.814l-.617 3.055z"/></svg>
                  PayPal
                </button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,margin:'16px 0'}}>
                <div style={{flex:1,height:1,background:'#e5e5e3'}}/>
                <span style={{fontSize:12,color:'#aaa'}}>or pay with card</span>
                <div style={{flex:1,height:1,background:'#e5e5e3'}}/>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {cart.map(item => (
                <div key={item.id + (item.size || '')}
                  style={{background:'#fff',border:'1px solid #f0f0ee',borderRadius:16,padding:16,display:'flex',gap:16,alignItems:'center'}}>
                  <div style={{width:90,height:90,borderRadius:10,overflow:'hidden',background:'#f5f5f3',flexShrink:0}}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ccc'}}>No image</div>
                    }
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:600,fontSize:15,margin:'0 0 2px'}}>{item.name}</p>
                    {item.size && <p style={{fontSize:13,color:'#888',margin:'0 0 2px'}}>Size: {item.size}</p>}
                    <p style={{fontSize:13,color:'#aaa',margin:0}}>€{item.price}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <button onClick={() => updateQty(item.id, item.qty - 1, item.size)}
                      style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid #e5e5e3',background:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                    <span style={{fontSize:15,fontWeight:500,minWidth:20,textAlign:'center'}}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1, item.size)}
                      style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid #e5e5e3',background:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  </div>
                  <div style={{textAlign:'right',minWidth:80}}>
                    <p style={{fontSize:15,fontWeight:600,margin:'0 0 4px'}}>€{(item.price * item.qty).toFixed(2)}</p>
                    <button onClick={() => removeFromCart(item.id, item.size)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:12,textDecoration:'underline',padding:0}}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => window.location.href = '/checkout'}
              style={{marginTop:24,background:'#000',color:'#fff',border:'none',padding:'16px 32px',borderRadius:999,fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Continue to details
            </button>
          </div>

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
                  <p style={{fontSize:14,fontWeight:500,margin:0}}>€{(item.price*item.qty).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div style={{borderTop:'1px solid #e5e5e3',paddingTop:16,display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#888'}}>
                <span>Subtotal</span><span>€{total.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'#aaa'}}>
                <span>Shipping</span><span>Calculated at next step</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,marginTop:4}}>
                <span>Total</span><span>€{total.toFixed(2)}</span>
              </div>
              <p style={{fontSize:11,color:'#bbb',margin:'4px 0 0',lineHeight:1.5}}>
                Promo codes and shipping cost will be applied at the confirmation step.
              </p>
            </div>

            <button onClick={() => window.location.href = '/checkout'}
              style={{width:'100%',marginTop:20,background:'#000',color:'#fff',border:'none',padding:'16px',borderRadius:999,fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Continue to details
            </button>
            <p style={{fontSize:11,color:'#bbb',textAlign:'center',marginTop:12,lineHeight:1.5}}>
              Payment details are entered securely on external checkout.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}