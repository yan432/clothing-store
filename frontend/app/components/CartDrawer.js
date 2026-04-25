'use client'
import { useCart } from '../context/CartContext'
import { useEffect, useState } from 'react'
import { getApiUrl } from '../lib/api'

export default function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, updateQty, total } = useCart()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [quickLoading, setQuickLoading] = useState(false)

  async function quickCheckout() {
    setQuickLoading(true)
    try {
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
          quick: true,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Checkout error: ' + JSON.stringify(data))
    } catch (e) {
      alert('Something went wrong: ' + e.message)
    }
    setQuickLoading(false)
  }

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      document.body.style.overflow = 'hidden'
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 350)
      document.body.style.overflow = ''
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return (
    <>
      <div onClick={onClose}
        style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:100,
          backdropFilter:'blur(2px)',
          opacity: visible ? 1 : 0,
          transition:'opacity 0.3s ease',
        }}/>

      <div style={{
        position:'fixed',top:0,right:0,bottom:0,width:'100%',maxWidth:420,
        background:'#fff',zIndex:101,display:'flex',flexDirection:'column',
        boxShadow:'-4px 0 32px rgba(0,0,0,0.12)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid #f0f0ee'}}>
          <h2 style={{fontSize:18,fontWeight:600,margin:0}}>
            Cart {cart.length > 0 && <span style={{color:'#aaa',fontWeight:400}}>({cart.reduce((s,i) => s+i.qty, 0)})</span>}
          </h2>
          <button onClick={onClose}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#888',padding:4,lineHeight:1}}>
            ×
          </button>
        </div>

        {/* Items */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
          {cart.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px 0'}}>
              <p style={{color:'#aaa',marginBottom:20}}>Your cart is empty</p>
              <button onClick={onClose}
                style={{background:'#000',color:'#fff',border:'none',padding:'12px 24px',borderRadius:999,fontSize:14,cursor:'pointer'}}>
                Continue shopping
              </button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {cart.map((item, idx) => (
                <div key={item.id+(item.size||'')}
                  style={{
                    display:'flex',gap:14,padding:'16px 0',
                    borderBottom: idx < cart.length-1 ? '1px solid #f5f5f3' : 'none',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(12px)',
                    transition: `opacity 0.3s ease ${idx * 0.05 + 0.1}s, transform 0.3s ease ${idx * 0.05 + 0.1}s`,
                  }}>
                  <div style={{width:80,height:80,borderRadius:10,overflow:'hidden',background:'#f5f5f3',flexShrink:0}}>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <p style={{fontSize:14,fontWeight:500,margin:'0 0 4px',lineHeight:1.3}}>{item.name}</p>
                      <button onClick={() => removeFromCart(item.id, item.size)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:18,padding:0,flexShrink:0,lineHeight:1}}>×</button>
                    </div>
                    {item.size && <p style={{fontSize:12,color:'#888',margin:'0 0 2px'}}>Size: {item.size}</p>}
                    <p style={{fontSize:13,color:'#aaa',margin:'0 0 10px'}}>€{item.price}</p>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,border:'1px solid #e5e5e3',borderRadius:999,padding:'4px 12px'}}>
                        <button onClick={() => updateQty(item.id, item.qty - 1, item.size)}
                          style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#555',padding:0,lineHeight:1}}>−</button>
                        <span style={{fontSize:13,fontWeight:500,minWidth:16,textAlign:'center'}}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1, item.size)}
                          style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#555',padding:0,lineHeight:1}}>+</button>
                      </div>
                      <p style={{fontSize:14,fontWeight:600,margin:0}}>€{(item.price * item.qty).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{
            padding:'20px 24px',borderTop:'1px solid #f0f0ee',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition:'opacity 0.35s ease 0.15s, transform 0.35s ease 0.15s',
          }}>
            <div style={{marginBottom:18}}>
              <p style={{fontSize:12,color:'#9a9a95',textAlign:'center',marginBottom:10}}>Quick checkout</p>
              <div style={{display:'flex',gap:10}}>
                <button
                  type="button"
                  onClick={quickCheckout}
                  disabled={quickLoading}
                  style={{
                    flex:1,
                    background:'#000',
                    color:'#fff',
                    border:'none',
                    padding:'12px',
                    borderRadius:10,
                    fontSize:13,
                    fontWeight:500,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:8,
                    cursor: quickLoading ? 'default' : 'pointer',
                    opacity: quickLoading ? 0.7 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  {quickLoading ? '...' : 'Apple Pay'}
                </button>
                <button
                  type="button"
                  onClick={quickCheckout}
                  disabled={quickLoading}
                  style={{
                    flex:1,
                    background:'#003087',
                    color:'#fff',
                    border:'none',
                    padding:'12px',
                    borderRadius:10,
                    fontSize:13,
                    fontWeight:500,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:8,
                    cursor: quickLoading ? 'default' : 'pointer',
                    opacity: quickLoading ? 0.7 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.315 2.642 1.04 4.73-.315 2.386-1.167 4.006-2.53 4.823-1.22.737-2.808.908-4.148.908h-2.17L11.027 15.93l-.22 1.248-3.731 4.16zm12.585-9.199c-.115.607-.29 1.146-.534 1.613-.805 1.553-2.302 2.341-4.45 2.341H12.62a.67.67 0 0 0-.663.57l-1.137 7.198H7.076l3.655-4.073 3.6-20.41h3.5c1.358 0 2.322.298 2.875.891.56.6.746 1.544.572 2.814l-.617 3.055z"/>
                  </svg>
                  {quickLoading ? '...' : 'PayPal'}
                </button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:12}}>
                <div style={{flex:1,height:1,background:'#ecece8'}} />
                <span style={{fontSize:11,color:'#9d9d97'}}>or pay with card</span>
                <div style={{flex:1,height:1,background:'#ecece8'}} />
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:14,color:'#888'}}>Subtotal</span>
              <span style={{fontSize:14,color:'#888'}}>€{total.toFixed(2)}</span>
            </div>
            <p style={{fontSize:11,color:'#bbb',margin:'0 0 12px'}}>Shipping & promo codes at next step</p>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:16,fontWeight:700}}>Total</span>
              <span style={{fontSize:16,fontWeight:700}}>€{total.toFixed(2)}</span>
            </div>
            <button onClick={() => { onClose(); window.location.href = '/checkout' }}
              style={{width:'100%',background:'#000',color:'#fff',border:'none',padding:'16px',borderRadius:999,fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:10}}>
              Checkout
            </button>
            <button onClick={() => { onClose(); window.location.href = '/cart' }}
              style={{width:'100%',background:'none',color:'#555',border:'1px solid #e5e5e3',padding:'14px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer'}}>
              View cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}