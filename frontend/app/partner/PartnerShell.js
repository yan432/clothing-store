'use client'
import { useState } from 'react'
import BrandOnly from '../components/BrandOnly'
import PartnerSidebar from './_components/Sidebar'
import { tokens } from '../admin/_components/tokens'

export default function PartnerShell({ children }) {
  const [info, setInfo] = useState(null)

  return (
    <BrandOnly onResolved={setInfo}>
      <div className="operations-shell partner-shell" style={{ display: 'flex', alignItems: 'stretch', background: tokens.color.bg, minHeight: '100vh' }}>
        <PartnerSidebar brand={info?.brand} />
        <main className="operations-main" style={{ flex: 1, minWidth: 0, padding: '32px 32px 64px' }}>
          {children}
        </main>
      </div>
    </BrandOnly>
  )
}
