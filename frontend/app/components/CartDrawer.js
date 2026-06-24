'use client'
import { useCart } from '../context/CartContext'
import { getApiUrl } from '../lib/api'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getMessages, localeFromPathname, pathForLocale, UK_LOCALE } from '../lib/i18n'
import { currencyForLocale, priceForLocale, eurToUah, formatPrice } from '../lib/money'
import { useUahRate } from '../lib/useUahRate'

const DEFAULT_THRESHOLD = 120

function ShippingBar({ total, threshold, labels, currency }) {
  const remaining = Math.max(0, threshold - total)
  const progress = Math.min(100, (total / threshold) * 100)
  const reached = remaining === 0

  // Text lags behind the bar by the bar's transition duration (500ms)
  // so the bar visually fills first, then the message changes.
  const [textReached, setTextReached] = useState(reached)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setTextReached(reached), reached ? 500 : 0)
    return () => clearTimeout(timerRef.current)
  }, [reached])

  return (
    <div style={{ padding: '10px 24px 12px', borderBottom: '1px solid #0a0a0a', background: '#fff' }}>
      <p style={{
        fontSize: 12, margin: '0 0 7px', textAlign: 'center',
        color: textReached ? '#0a0a0a' : '#555',
        // fade out the "€0" text while bar animates, fade in success after
        opacity: (reached && !textReached) ? 0 : 1,
        transition: 'color 0.3s ease, opacity 0.2s ease',
      }}>
        {textReached
          ? <><Sparkles size={13} strokeWidth={1.8} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {labels.drawerFreeShippingUnlocked}</>
          : <>{labels.drawerFreeShippingRemainingPrefix} <strong>{formatPrice(remaining, currency)}</strong> {labels.drawerFreeShippingRemainingSuffix}</>
        }
      </p>
      <div style={{ height: 4, borderRadius: 0, background: '#d7d7d2', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 0,
          background: reached ? '#d7ff2f' : '#111',
          width: `${progress}%`,
          transition: 'width 0.5s ease, background 0.4s ease',
        }} />
      </div>
    </div>
  )
}

export default function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, updateQty } = useCart()
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const currency = currencyForLocale(locale)
  const uahRate = useUahRate(locale === UK_LOCALE)
  const lineUnit = (item) => priceForLocale(item, locale, uahRate)
  const total = cart.reduce((sum, i) => sum + lineUnit(i) * i.qty, 0)
  const d = getMessages(locale)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)

  useEffect(() => {
    fetch(getApiUrl('/settings'))
      .then(r => r.ok ? r.json() : {})
      .then(s => {
        const t = parseFloat(s.shipping_free_threshold || DEFAULT_THRESHOLD)
        if (!isNaN(t) && t > 0) setThreshold(t)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let frameOne
    let frameTwo
    let closeTimer
    if (open) {
      document.body.style.overflow = 'hidden'
      frameOne = requestAnimationFrame(() => {
        setMounted(true)
        frameTwo = requestAnimationFrame(() => setVisible(true))
      })
    } else {
      document.body.style.overflow = ''
      frameOne = requestAnimationFrame(() => setVisible(false))
      closeTimer = setTimeout(() => setMounted(false), 350)
    }
    return () => {
      if (frameOne) cancelAnimationFrame(frameOne)
      if (frameTwo) cancelAnimationFrame(frameTwo)
      clearTimeout(closeTimer)
    }
  }, [open])

  if (!mounted) return null

  return (
    <>
      <div onClick={onClose}
        style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.42)',zIndex:100,
          backdropFilter:'blur(1px)',
          opacity: visible ? 1 : 0,
          transition:'opacity 0.3s ease',
        }}/>

      <div style={{
        position:'fixed',top:0,right:0,bottom:0,width:'100%',maxWidth:420,
        background:'#fff',zIndex:101,display:'flex',flexDirection:'column',
        borderLeft:'1px solid #0a0a0a',
        boxShadow:'none',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 24px',borderBottom:'1px solid #0a0a0a'}}>
          <h2 style={{fontSize:16,fontWeight:900,margin:0,letterSpacing:'0.08em',textTransform:'uppercase'}}>
            {d.cartPage.title} {cart.length > 0 && <span style={{color:'#555',fontWeight:800}}>({cart.reduce((s,i) => s+i.qty, 0)})</span>}
          </h2>
          <button onClick={onClose}
            style={{background:'#fff',border:'1px solid #0a0a0a',borderRadius:0,cursor:'pointer',fontSize:22,color:'#0a0a0a',width:34,height:34,padding:0,lineHeight:1}}>
            ×
          </button>
        </div>

        {/* Free shipping progress bar */}
        <ShippingBar total={total} threshold={currency === 'UAH' ? eurToUah(threshold, uahRate) : threshold} labels={d.cartPage} currency={currency} />

        {/* Items */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
          {cart.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px 0'}}>
              <p style={{color:'#aaa',marginBottom:20}}>{d.cartPage.empty}</p>
              <button onClick={onClose}
                style={{background:'#000',color:'#fff',border:'1px solid #000',padding:'13px 24px',borderRadius:0,fontSize:12,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer'}}>
                {d.cart.continueShopping}
              </button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {cart.map((item, idx) => (
                <div key={item.id+(item.size||'')}
                  style={{
                    display:'flex',gap:14,padding:'16px 0',
                    borderBottom: idx < cart.length-1 ? '1px solid #d7d7d2' : 'none',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(12px)',
                    transition: `opacity 0.3s ease ${idx * 0.05 + 0.1}s, transform 0.3s ease ${idx * 0.05 + 0.1}s`,
                  }}>
                  <a href={pathForLocale(`/products/${item.slug || item.id}`, locale)} onClick={onClose}
                    style={{width:82,height:82,borderRadius:0,overflow:'hidden',background:'#fff',border:'none',flexShrink:0,display:'block'}}>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                  </a>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <a href={pathForLocale(`/products/${item.slug || item.id}`, locale)} onClick={onClose}
                        style={{fontSize:13,fontWeight:900,margin:'0 0 4px',lineHeight:1.25,color:'inherit',textDecoration:'none',display:'block',letterSpacing:'0.03em',textTransform:'uppercase'}}>
                        {item.name}
                      </a>
                      <button onClick={() => removeFromCart(item.id, item.size)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:18,padding:0,flexShrink:0,lineHeight:1}}>×</button>
                    </div>
                    {item.size && <p style={{fontSize:11,color:'#666',margin:'0 0 2px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>{d.cartPage.size}: {item.size}</p>}
                    <p style={{fontSize:12,color:'#666',margin:'0 0 10px',fontWeight:700}}>{formatPrice(lineUnit(item), currency)}</p>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,border:'1px solid #0a0a0a',borderRadius:0,padding:'4px 10px'}}>
                        <button onClick={() => updateQty(item.id, item.qty - 1, item.size)}
                          style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#555',padding:0,lineHeight:1}}>−</button>
                        <span style={{fontSize:13,fontWeight:500,minWidth:16,textAlign:'center'}}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1, item.size)}
                          disabled={item.available_stock > 0 && item.qty >= item.available_stock}
                          style={{background:'none',border:'none',fontSize:16,padding:0,lineHeight:1,
                            cursor: (item.available_stock > 0 && item.qty >= item.available_stock) ? 'not-allowed' : 'pointer',
                            color:  (item.available_stock > 0 && item.qty >= item.available_stock) ? '#ccc' : '#555',
                          }}>+</button>
                      </div>
                      <p style={{fontSize:14,fontWeight:600,margin:0}}>{formatPrice(lineUnit(item) * item.qty, currency)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{
            padding:'20px 24px',borderTop:'1px solid #0a0a0a',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition:'opacity 0.35s ease 0.15s, transform 0.35s ease 0.15s',
          }}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:14,color:'#888'}}>{d.cartPage.subtotal}</span>
              <span style={{fontSize:14,color:'#888'}}>{formatPrice(total, currency)}</span>
            </div>
            <p style={{fontSize:11,color:'#bbb',margin:'0 0 12px'}}>{d.cartPage.drawerShippingPromo}</p>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:16,fontWeight:700}}>{d.cartPage.total}</span>
              <span style={{fontSize:16,fontWeight:700}}>{formatPrice(total, currency)}</span>
            </div>
            <button onClick={() => { onClose(); window.location.href = pathForLocale('/checkout', locale) }}
              style={{width:'100%',background:'#000',color:'#fff',border:'1px solid #000',padding:'16px',borderRadius:0,fontSize:12,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer',marginBottom:10}}>
              {d.cartPage.checkout}
            </button>
            <button onClick={onClose}
              style={{width:'100%',background:'#fff',color:'#0a0a0a',border:'1px solid #0a0a0a',padding:'14px',borderRadius:0,fontSize:12,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer'}}>
              {d.cart.continueShopping}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
