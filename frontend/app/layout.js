import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import NavBar from './components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: {
    default: 'STORE — Minimal Clothing',
    template: '%s — STORE',
  },
  description: 'Minimal essentials designed for everyday wear.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourstore.com',
    siteName: 'STORE',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <NavBar />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}