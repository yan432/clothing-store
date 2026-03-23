import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import NavBar from './components/NavBar'
import DrawerWrapper from './components/DrawerWrapper'
import Footer from './components/Footer'
import EmailCapturePopup from './components/EmailCapturePopup'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: { default: 'STORE — Minimal Clothing', template: '%s — STORE' },
  description: 'Minimal essentials designed for everyday wear.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <NavBar />
            <DrawerWrapper />
            <EmailCapturePopup />
            {children}
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}