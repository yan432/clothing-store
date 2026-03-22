'use client'
import { useCart } from '../context/CartContext'
import { useEffect, useMemo, useState } from 'react'
import { parseSizeOptionsFromTags } from '../lib/sizeOptions'

export default function AddToCartButton({ product, showSizeSelector = false }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const [maxReached, setMaxReached] = useState(false)
  const [selectedSize, setSelectedSize] = useState('')
  const sizeOptions = useMemo(() => parseSizeOptionsFromTags(product?.tags), [product?.tags])
  const shouldShowSizeSelector = showSizeSelector && sizeOptions.length > 0
  const mustSelectSize = shouldShowSizeSelector && sizeOptions.length > 1
  const availableStock = product.available_stock ?? product.stock ?? 0
  const isInStock = availableStock > 0
  const canAdd = isInStock && (!mustSelectSize || Boolean(selectedSize))

  useEffect(() => {
    if (sizeOptions.length === 1) {
      setSelectedSize(sizeOptions[0])
      return
    }
    if (!sizeOptions.includes(selectedSize)) {
      setSelectedSize('')
    }
  }, [sizeOptions, selectedSize])

  function handleAdd() {
    if (!canAdd) return
    const result = addToCart({ ...product, size: selectedSize || sizeOptions[0] || null })
    if (!result?.ok) {
      setMaxReached(true)
      setTimeout(() => setMaxReached(false), 1800)
      return
    }
    setMaxReached(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
      {shouldShowSizeSelector && (
        <div style={{border:'1px solid #deded8',borderRadius:8,padding:'8px 12px',background:'#fff'}}>
          <p style={{fontSize:12,color:'#666660',margin:'0 0 6px'}}>Size</p>
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            style={{width:'100%',border:'none',outline:'none',fontSize:16,background:'transparent',color:'#1a1a18'}}>
            {mustSelectSize && <option value="" disabled>Select size</option>}
            {sizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      )}
      <button onClick={handleAdd} disabled={!canAdd}
        style={{background: added ? '#16a34a' : '#000',color:'#fff',border:'none',padding:'16px 24px',borderRadius:999,fontSize:14,fontWeight:500,cursor:canAdd ? 'pointer' : 'not-allowed',transition:'background 0.2s, opacity 0.2s',width:'100%',opacity:canAdd ? 1 : 0.55}}>
        {isInStock
          ? (maxReached
            ? 'Max available quantity reached'
            : added
              ? 'Added to cart!'
              : mustSelectSize && !selectedSize
                ? 'Select size first'
                : 'Add to Cart')
          : 'Out of stock'}
      </button>
      <a href="/cart"
        style={{border:'1px solid #e5e5e3',padding:'14px 24px',borderRadius:999,fontSize:14,textAlign:'center',textDecoration:'none',color:'inherit',transition:'border-color 0.2s'}}>
        View Cart
      </a>
    </div>
  )
}