'use client'
import { useState } from 'react'
import { getApiUrl } from '../lib/api'
import AdminOnly from '../components/AdminOnly'

export default function UploadPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadProducts() {
    const res = await fetch(getApiUrl('/products/admin'))
    const data = await res.json()
    setProducts(data)
  }

  async function handleUpload(productId, files) {
    setLoading(true)
    setMessage('')
    try {
      const multiForm = new FormData()
      for (const file of files) {
        multiForm.append('files', file)
      }

      let res = await fetch(getApiUrl('/products/' + productId + '/image'), {
        method: 'PUT',
        body: multiForm
      })

      // Backward-compatible fallback: older backend versions only accept "file".
      if (!res.ok) {
        let allOk = true
        for (const file of files) {
          const singleForm = new FormData()
          singleForm.append('file', file)
          const singleRes = await fetch(getApiUrl('/products/' + productId + '/image'), {
            method: 'PUT',
            body: singleForm
          })
          if (!singleRes.ok) {
            allOk = false
            res = singleRes
            break
          }
        }
        if (allOk) {
          setMessage(files.length > 1 ? 'Photos uploaded!' : 'Photo uploaded!')
          loadProducts()
          setLoading(false)
          return
        }
      }

      if (res.ok) {
        setMessage(files.length > 1 ? 'Photos uploaded!' : 'Photo uploaded!')
        loadProducts()
      } else {
        const errorText = await res.text()
        setMessage('Error uploading: ' + (errorText || 'unknown error'))
      }
    } catch (error) {
      setMessage('Error uploading: ' + (error?.message || 'network error'))
    }
    setLoading(false)
  }

  return (
    <AdminOnly>
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
                  {Array.isArray(product.image_urls) && product.image_urls.length > 0 && (
                    <p style={{fontSize:12,color:'#999',marginTop:4}}>
                      {product.image_urls.length} photos uploaded
                    </p>
                  )}
                </div>

                <label style={{cursor:'pointer'}}>
                  <input type="file" accept="image/*" multiple style={{display:'none'}}
                    onChange={(e) => e.target.files?.length && handleUpload(product.id, Array.from(e.target.files))}
                    disabled={loading}
                  />
                  <span style={{background: product.image_url ? '#f5f5f3' : '#000',color: product.image_url ? '#333' : '#fff',padding:'8px 18px',borderRadius:999,fontSize:13,fontWeight:500}}>
                    {product.image_url ? 'Add photos' : 'Upload photos'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </main>
    </AdminOnly>
  )
}