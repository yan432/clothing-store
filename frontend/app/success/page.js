'use client'
import { useEffect } from 'react'
import { useCart } from '../context/CartContext'

export default function SuccessPage() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [])

  return (
    <main style={{minHeight:'80vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:24}}>
      <div style={{width:64,height:64,borderRadius:'50%',background:'#f0fdf4',border:'2px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:24,color:'#16a34a'}}>
        ✓
      </div>
      <h1 style={{fontSize:32,fontWeight:600,marginBottom:8}}>Order confirmed!</h1>
      <p style={{color:'#aaa',marginBottom:32,maxWidth:400}}>Thank you for your purchase. You will receive a confirmation email shortly.</p>
      <a href="/products" style={{background:'#000',color:'#fff',padding:'14px 32px',borderRadius:999,fontSize:14,textDecoration:'none'}}>
        Continue Shopping
      </a>
    </main>
  )
}