'use client'
import { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const price = Number(product.price || 0)
  const primaryImage = (Array.isArray(product.image_urls) && product.image_urls[0]) || product.image_url
  const priceLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
  const isInStock = (product.stock || 0) > 0
  const stockLabel = isInStock ? `In stock: ${product.stock}` : 'Out of stock'
  const description = (product.description || '').trim()

  function handleAddToCart() {
    if (!isInStock) return
    addToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <article style={{display:'flex',flexDirection:'column',gap:12}}>
      <a href={'/products/' + product.id}
        className="product-card"
        style={{textDecoration:'none',color:'inherit',display:'block'}}>
        <div style={{position:'relative',aspectRatio:'3/4',background:'#f5f5f3',borderRadius:16,overflow:'hidden',marginBottom:14}}>
          <div style={{
            position:'absolute',
            top:10,
            left:10,
            zIndex:1,
            fontSize:11,
            fontWeight:500,
            borderRadius:999,
            padding:'6px 10px',
            background:isInStock ? 'rgba(255,255,255,0.92)' : 'rgba(26,26,24,0.85)',
            color:isInStock ? '#1a1a18' : '#fff',
            border:isInStock ? '1px solid #e5e5e0' : '1px solid transparent',
          }}>
            {stockLabel}
          </div>
          {primaryImage
            ? <img src={primaryImage} alt={product.name} className="product-img"/>
            : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#ccc'}}>No image</div>
          }
        </div>
        <p style={{fontSize:11,color:'#8f8f87',letterSpacing:'0.1em',textTransform:'uppercase',margin:'0 0 8px'}}>
          {product.category || 'Essentials'}
        </p>
        <h2 style={{fontSize:16,fontWeight:600,margin:'0 0 6px',lineHeight:1.35}}>
          {product.name}
        </h2>
        <p style={{fontSize:16,fontWeight:600,margin:'0 0 8px'}}>
          {priceLabel}
        </p>
        <p style={{
          fontSize:13,
          color:'#6d6d66',
          lineHeight:1.5,
          margin:0,
          minHeight:40,
          display:'-webkit-box',
          WebkitLineClamp:2,
          WebkitBoxOrient:'vertical',
          overflow:'hidden',
        }}>
          {description || 'Minimal everyday essential. Tap to view full details.'}
        </p>
      </a>
      <button
        onClick={handleAddToCart}
        disabled={!isInStock}
        style={{
          width:'100%',
          border:'none',
          borderRadius:999,
          padding:'13px 18px',
          fontSize:14,
          fontWeight:600,
          cursor:isInStock ? 'pointer' : 'not-allowed',
          background:added ? '#16a34a' : '#111',
          color:'#fff',
          opacity:isInStock ? 1 : 0.6,
          transition:'background 0.2s ease, opacity 0.2s ease',
        }}>
        {isInStock ? (added ? 'Added to cart' : 'Add to cart') : 'Unavailable'}
      </button>
    </article>
  )
}