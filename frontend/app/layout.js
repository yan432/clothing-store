import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from './context/CartContext'
import NavBar from './components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: {
    default: 'STORE — Minimal Clothing',
    template: '%s — STORE',
  },
  description: 'Minimal essentials designed for everyday wear.',
  keywords: ['clothing', 'fashion', 'minimal', 'store'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourstore.com',
    siteName: 'STORE',
    title: 'STORE — Minimal Clothing',
    description: 'Minimal essentials designed for everyday wear.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STORE — Minimal Clothing',
    description: 'Minimal essentials designed for everyday wear.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <NavBar />
          {children}
        </CartProvider>
      </body>
    </html>
  )
}