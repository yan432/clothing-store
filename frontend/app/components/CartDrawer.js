'use client'
import { useCart } from '../context/CartContext'
import { getApiUrl } from '../lib/api'
import { useEffect, useRef, useState } from 'react'

const DEFAULT_THRESHOLD = 120

function ShippingBar({ total, threshold }) {
  const remaining = Math.max(0, threshold - total)
  const progress = Math.min(100, (total / threshold) * 100)
  const reached = remaining === 0

  // Text lags behind the bar by the bar's transition duration (500ms)
  // so the bar visually fills first, then the message changes.
  const [textReached, setTextReached] = useState(reached)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (reached) {
      timerRef.current = setTimeout(() => setTextReached(true), 500)
    } else {
      setTextReached(false)
    }
    return () => clearTimeout(timerRef.current)
  }, [reached])

  return (
    <div style={{ padding: '10px 24px 12px', borderBottom: '1px solid #f0f0ee', background: '#fafaf8' }}>
      <p style={{
        fontSize: 12, margin: '0 0 7px', textAlign: 'center',
        color: textReached ? '#166534' : '#555',
        // fade out the "€0" text while bar animates, fade in success after
        opacity: (reached && !textReached) ? 0 : 1,
        transition: 'color 0.3s ease, opacity 0.2s ease',
      }}>
        {textReached
          ? '🎉 You\'ve unlocked free shipping!'
          : <>Add <strong>€{remaining.toFixed(2)}</strong> more for free shipping</>
        }
      </p>
      <div style={{ height: 4, borderRadius: 999, background: '#e5e5e3', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: reached ? '#16a34a' : '#111',
          width: `${progress}%`,
          transition: 'width 0.5s ease, background 0.4s ease',
        }} />
      </div>
    </div>
  )
}

export default function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, updateQty, total } = useCart()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)

  useEffect(() => {
    fetch(getApiUrl('/settings'))
      .then(r => r.ok ? r.json() : {})
      .then(s => {
        const t = parseFloat(s.shipping_free_threshold || DEFAULT_THRESHOLD)
        if (!isNaN(t) && t > 0) setThreshold(t)
      })
      .catch(() => {})
  }, [])

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

        {/* Free shipping progress bar */}
        <ShippingBar total={total} threshold={threshold} />

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
                          disabled={item.available_stock > 0 && item.qty >= item.available_stock}
                          style={{background:'none',border:'none',fontSize:16,padding:0,lineHeight:1,
                            cursor: (item.available_stock > 0 && item.qty >= item.available_stock) ? 'not-allowed' : 'pointer',
                            color:  (item.available_stock > 0 && item.qty >= item.available_stock) ? '#ccc' : '#555',
                          }}>+</button>
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
            <button onClick={onClose}
              style={{width:'100%',background:'none',color:'#555',border:'1px solid #e5e5e3',padding:'14px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer'}}>
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}