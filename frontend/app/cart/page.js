'use client'
import { useCart } from '../context/CartContext'

export default function CartPage() {
  const { cart, removeFromCart, updateQty, total, clearCart } = useCart()

  function handleCheckout() {
    window.location.href = '/checkout'
  }

  const steps = [
    { n: 1, label: 'Cart', active: true },
    { n: 2, label: 'Details', active: false },
    { n: 3, label: 'Shipping', active: false, disabled: true },
    { n: 4, label: 'Payment', active: false, disabled: true },
  ]

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
                    <p style={{fontSize:13,color:'#aaa',margin:0}}>${item.price}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <button onClick={() => updateQty(item.id, item.qty - 1)}
                      style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid #e5e5e3',background:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      −
                    </button>
                    <span style={{fontSize:15,fontWeight:500,minWidth:20,textAlign:'center'}}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)}
                      style={{width:32,height:32,borderRadius:'50%',border:'1.5px solid #e5e5e3',background:'none',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      +
                    </button>
                  </div>
                  <div style={{textAlign:'right',minWidth:80}}>
                    <p style={{fontSize:15,fontWeight:600,margin:'0 0 4px'}}>${(item.price * item.qty).toFixed(2)}</p>
                    <button onClick={() => removeFromCart(item.id)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:12,textDecoration:'underline',padding:0}}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleCheckout}
              style={{marginTop:24,background:'#000',color:'#fff',border:'none',padding:'16px 32px',borderRadius:999,fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Continue to details
            </button>
          </div>

          <div style={{background:'#fafaf8',border:'1px solid #f0f0ee',borderRadius:20,padding:24,position:'sticky',top:100}}>
            <h2 style={{fontSize:22,fontWeight:700,margin:'0 0 20px'}}>Order summary</h2>
            <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:20}}>
              {cart.map(item => (
                <div key={item.id + (item.size||'')} style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{width:52,height:52,borderRadius:8,overflow:'hidden',background:'#eee',flexShrink:0}}>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:14,fontWeight:500,margin:'0 0 2px'}}>{item.name}</p>
                    <p style={{fontSize:12,color:'#aaa',margin:0}}>x{item.qty}{item.size ? ` • ${item.size}` : ''}</p>
                  </div>
                  <p style={{fontSize:14,fontWeight:500,margin:0}}>${(item.price * item.qty).toFixed(2)}</p>
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
            <button onClick={handleCheckout}
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