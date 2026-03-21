'use client'
import { useState } from 'react'

export default function UploadPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadProducts() {
    const res = await fetch('https://clothing-store-production-983f.up.railway.app/products')
    const data = await res.json()
    setProducts(data)
  }

  async function handleUpload(productId, file) {
    setLoading(true)
    setMessage('')
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('https://clothing-store-production-983f.up.railway.app/products/' + productId + '/image', {
      method: 'PUT',
      body: form
    })

    if (res.ok) {
      setMessage('Photo uploaded!')
      loadProducts()
    } else {
      setMessage('Error uploading')
    }
    setLoading(false)
  }

  return (
    <main style={{maxWidth:800,margin:'0 auto',padding:'40px 24px'}}>
      <h1 style={{fontSize:24,fontWeight:600,marginBottom:8}}>Upload Product Photos</h1>
      <p style={{color:'#888',fontSize:14,marginBottom:32}}>Add photos to your products</p>

      {message && (
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 16px',marginBottom:24,fontSize:14,color:'#166534'}}>
          {message}
        </div>
      )}

      {products.length === 0 ? (
        <button onClick={loadProducts}
          style={{background:'#000',color:'#fff',padding:'12px 24px',borderRadius:999,fontSize:14,border:'none',cursor:'pointer'}}>
          Load Products
        </button>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {products.map(product => (
            <div key={product.id}
              style={{display:'flex',alignItems:'center',gap:16,background:'#fff',border:'1px solid #eee',borderRadius:16,padding:16}}>

              <div style={{width:72,height:72,borderRadius:10,overflow:'hidden',background:'#f5f5f3',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span style={{fontSize:11,color:'#ccc'}}>No photo</span>
                }
              </div>

              <div style={{flex:1}}>
                <p style={{fontWeight:500,fontSize:14,marginBottom:2}}>{product.name}</p>
                <p style={{fontSize:13,color:'#888'}}>${product.price} · {product.category}</p>
              </div>

              <label style={{cursor:'pointer'}}>
                <input type="file" accept="image/*" style={{display:'none'}}
                  onChange={(e) => e.target.files[0] && handleUpload(product.id, e.target.files[0])}
                  disabled={loading}
                />
                <span style={{background: product.image_url ? '#f5f5f3' : '#000',color: product.image_url ? '#333' : '#fff',padding:'8px 18px',borderRadius:999,fontSize:13,fontWeight:500}}>
                  {product.image_url ? 'Replace' : 'Upload'}
                </span>
              </label>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}