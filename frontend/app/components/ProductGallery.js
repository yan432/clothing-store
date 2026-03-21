'use client'
import { useMemo, useState } from 'react'

export default function ProductGallery({ product }) {
  const images = useMemo(() => {
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      return product.image_urls
    }
    return product.image_url ? [product.image_url] : []
  }, [product.image_url, product.image_urls])
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex] || ''

  return (
    <div style={{display:'grid',gridTemplateColumns:'88px 1fr',gap:14,alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {images.map((src, index) => (
          <button
            key={src + index}
            onClick={() => setActiveIndex(index)}
            style={{
              border:'1px solid ' + (activeIndex === index ? '#111' : '#e5e5e0'),
              background:'#fff',
              borderRadius:10,
              width:88,
              aspectRatio:'3 / 4',
              overflow:'hidden',
              cursor:'pointer',
              padding:0,
            }}>
            <img src={src} alt={product.name + ' thumbnail ' + (index + 1)} style={{width:'100%',height:'100%',objectFit:'cover'}} />
          </button>
        ))}
      </div>
      <div style={{aspectRatio:'3 / 4',background:'#f5f5f3',borderRadius:20,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',color:'#ccc'}}>
        {activeImage
          ? <img src={activeImage} alt={product.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : 'No image'
        }
      </div>
    </div>
  )
}
