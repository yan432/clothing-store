'use client'
import { useState } from 'react'

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false)

  return (
    <a href={'/products/' + product.id}
      style={{textDecoration:'none',color:'inherit',display:'block'}}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div style={{aspectRatio:'3/4',background:'#f5f5f3',borderRadius:16,overflow:'hidden',marginBottom:14}}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name}
              style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.4s ease',transform: hovered ? 'scale(1.03)' : 'scale(1)'}}/>
          : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#ccc'}}>No image</div>
        }
      </div>
      <p style={{fontSize:11,color:'#aaa',letterSpacing:'0.1em',textTransform:'uppercase',margin:'0 0 4px'}}>{product.category}</p>
      <h2 style={{fontSize:15,fontWeight:500,margin:'0 0 6px',transition:'opacity 0.2s',opacity: hovered ? 0.6 : 1}}>{product.name}</h2>
      <p style={{fontSize:15,fontWeight:600,margin:0}}>${product.price}</p>
    </a>
  )
}