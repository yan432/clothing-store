'use client'
import { useCart } from '../context/CartContext'
import { useState } from 'react'
import { getApiUrl } from '../lib/api'

export default function CartPage() {
  const { cart, removeFromCart, updateQty, total, clearCart } = useCart()
  const [loading, setLoading] = useState(false)

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

  return (
    <main style={{maxWidth:700,margin:'0 auto',padding:'48px 24px'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:32}}>
        <h1 style={{fontSize:28,fontWeight:600,margin:0}}>Your Cart</h1>
        <button onClick={clearCart} style={{fontSize:13,color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>
          Clear all
        </button>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:32}}>
        {cart.map(item => (
          <div key={item.lineKey || item.id} style={{display:'flex',gap:16,alignItems:'center',background:'#fff',border:'1px solid #f0f0ee',borderRadius:16,padding:16}}>
            <div style={{width:80,height:80,borderRadius:10,overflow:'hidden',background:'#f5f5f3',flexShrink:0}}>
              {item.image_url
                ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ccc'}}>No image</div>
              }
            </div>
            <div style={{flex:1}}>
              <p style={{fontWeight:500,fontSize:14,margin:'0 0 4px'}}>{item.name}</p>
              {item.size && (
                <p style={{fontSize:12,color:'#666660',margin:'0 0 4px'}}>Size: {item.size}</p>
              )}
              <p style={{fontSize:13,color:'#aaa',margin:0}}>${item.price}</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button onClick={() => updateQty(item.lineKey || `${item.id}:${item.size || 'no-size'}`, item.qty - 1)}
                style={{width:28,height:28,borderRadius:'50%',border:'1px solid #e5e5e3',background:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
              <span style={{fontSize:14,fontWeight:500,minWidth:20,textAlign:'center'}}>{item.qty}</span>
              <button onClick={() => updateQty(item.lineKey || `${item.id}:${item.size || 'no-size'}`, item.qty + 1)}
                style={{width:28,height:28,borderRadius:'50%',border:'1px solid #e5e5e3',background:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
            </div>
            <p style={{fontSize:14,fontWeight:600,minWidth:60,textAlign:'right'}}>${(item.price * item.qty).toFixed(2)}</p>
            <button onClick={() => removeFromCart(item.lineKey || `${item.id}:${item.size || 'no-size'}`)}
              style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:18,padding:4}}>×</button>
          </div>
        ))}
      </div>

      <div style={{borderTop:'1px solid #f0f0ee',paddingTop:24,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <p style={{fontSize:13,color:'#aaa',margin:'0 0 4px'}}>Total</p>
          <p style={{fontSize:28,fontWeight:600,margin:0}}>${total.toFixed(2)}</p>
        </div>
        <button onClick={handleCheckout} disabled={loading}
          style={{background:'#000',color:'#fff',border:'none',padding:'16px 40px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer',opacity:loading?0.6:1}}>
          {loading ? 'Loading...' : 'Checkout'}
        </button>
      </div>
    </main>
  )
}