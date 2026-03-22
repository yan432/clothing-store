'use client'
import { useCart } from '../context/CartContext'
import CartDrawer from './CartDrawer'

export default function DrawerWrapper() {
  const { drawerOpen, setDrawerOpen } = useCart()
  return <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
}