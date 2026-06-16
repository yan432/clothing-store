'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { trackPurchase } from '../lib/track'
import { getStoredUtm } from '../components/UtmCapture'
import { getApiUrl } from '../lib/api'
import { getMessages, localeFromPathname, pathForLocale } from '../lib/i18n'

export default function SuccessPage() {
  const pathname = usePathname() || '/'
  const locale = localeFromPathname(pathname)
  const d = getMessages(locale)
  const { clearCart } = useCart()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const paymentIntentId = params.get('payment_intent')
    if (sessionId) {
      fetch(getApiUrl(`/checkout/sync-session/${encodeURIComponent(sessionId)}`), {
        method: 'POST',
      }).catch(() => {})
    }
    if (paymentIntentId) {
      fetch(getApiUrl(`/checkout/sync-payment-intent/${encodeURIComponent(paymentIntentId)}`), {
        method: 'POST',
      }).catch(() => {})
    }

    try {
      const pendingOrder = JSON.parse(localStorage.getItem('pending_order') || 'null')
      // Only clear cart and track purchase if we actually came from checkout
      if (pendingOrder) {
        clearCart()
        const purchaseKey = `purchase_tracked:${pendingOrder.order_id || pendingOrder.id || sessionId || paymentIntentId || 'unknown'}`
        const alreadyTracked = sessionStorage.getItem(purchaseKey)
        if (!alreadyTracked) {
          trackPurchase({
            orderId:  pendingOrder.order_id || pendingOrder.id || 'unknown',
            total:    Number(pendingOrder.total || pendingOrder.amount_total || 0),
            currency: pendingOrder.currency || 'EUR',
            items:    pendingOrder.items || [],
            utm:      getStoredUtm(),
          })
          sessionStorage.setItem(purchaseKey, '1')
          localStorage.removeItem('pending_order')
        }
      }
    } catch (_) {}
  }, [clearCart])

  return (
    <main style={{minHeight:'80vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:24}}>
      <div style={{width:64,height:64,borderRadius:'50%',background:'#f0fdf4',border:'2px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:24,color:'#16a34a'}}>
        ✓
      </div>
      <h1 style={{fontSize:32,fontWeight:600,marginBottom:8}}>{d.success.title}</h1>
      <p style={{color:'#aaa',marginBottom:32,maxWidth:400}}>{d.success.text}</p>
      <Link href={pathForLocale('/products', locale)} style={{background:'#000',color:'#fff',padding:'14px 32px',borderRadius:999,fontSize:14,textDecoration:'none'}}>
        {d.success.continueShopping}
      </Link>
    </main>
  )
}
