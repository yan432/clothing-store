'use client'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const { count } = useCart()

  return (
    <nav style={{position:'sticky',top:0,zIndex:50,borderBottom:'1px solid #f0f0ee',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <a href="/" style={{fontSize:15,fontWeight:600,letterSpacing:'0.1em',textDecoration:'none',color:'inherit'}}>STORE</a>
      <div style={{display:'flex',gap:32,fontSize:14,color:'#666'}}>
        <a href="/products" style={{color:'inherit',textDecoration:'none'}}>Shop</a>
        <a href="/cart" style={{color: count > 0 ? '#000' : 'inherit',fontWeight: count > 0 ? 500 : 400,textDecoration:'none'}}>
          Cart {count > 0 ? '(' + count + ')' : '(0)'}
        </a>
      </div>
    </nav>
  )
}