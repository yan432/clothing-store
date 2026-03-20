'use client'
import { useCart } from '../context/CartContext'
import { useState } from 'react'

export default function AddToCartButton({ product }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)

  function handleAdd() {
    addToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
      <button onClick={handleAdd}
        style={{background: added ? '#16a34a' : '#000',color:'#fff',border:'none',padding:'16px 24px',borderRadius:999,fontSize:14,fontWeight:500,cursor:'pointer',transition:'background 0.2s',width:'100%'}}>
        {added ? 'Added to cart!' : 'Add to Cart'}
      </button>
      <a href="/cart"
        style={{border:'1px solid #e5e5e3',padding:'14px 24px',borderRadius:999,fontSize:14,textAlign:'center',textDecoration:'none',color:'inherit',transition:'border-color 0.2s'}}>
        View Cart
      </a>
    </div>
  )
}