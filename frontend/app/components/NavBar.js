'use client'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { count } = useCart()
  const { user, signOut, isAdmin } = useAuth()

  return (
    <nav style={{position:'sticky',top:0,zIndex:50,borderBottom:'1px solid #f0f0ee',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <a href="/" style={{fontSize:15,fontWeight:600,letterSpacing:'0.1em',textDecoration:'none',color:'inherit'}}>STORE</a>
      <div style={{display:'flex',gap:24,fontSize:14,color:'#666',alignItems:'center'}}>
        <a href="/products" style={{color:'inherit',textDecoration:'none'}}>Shop</a>
        {isAdmin && (
          <>
            <a href="/admin/orders" style={{color:'inherit',textDecoration:'none'}}>Admin</a>
            <a href="/upload" style={{color:'inherit',textDecoration:'none'}}>Upload</a>
          </>
        )}
        <a href="/cart" style={{color: count > 0 ? '#000' : 'inherit',fontWeight: count > 0 ? 500 : 400,textDecoration:'none'}}>
          Cart {count > 0 ? '(' + count + ')' : '(0)'}
        </a>
        {user ? (
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <a href="/account" style={{color:'inherit',textDecoration:'none',fontSize:13}}>{user.email}</a>
            <button onClick={signOut}
              style={{background:'none',border:'1px solid #e5e5e3',padding:'5px 12px',borderRadius:999,fontSize:13,cursor:'pointer',color:'#666'}}>
              Sign out
            </button>
          </div>
        ) : (
          <a href="/auth" style={{background:'#000',color:'#fff',padding:'6px 16px',borderRadius:999,fontSize:13,textDecoration:'none'}}>
            Sign in
          </a>
        )}
      </div>
    </nav>
  )
}