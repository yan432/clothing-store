'use client'

import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

const accountSections = [
  { id: 'overview', title: 'My account', text: 'Manage your account details and settings.' },
  { id: 'orders', title: 'Orders', text: 'See your order history and current statuses.' },
  { id: 'returns', title: 'Returns', text: 'Start and track your returns in one place.' },
  { id: 'sizes', title: 'My sizes', text: 'Save preferred sizes for faster checkout.' },
  { id: 'help', title: 'Help & FAQ', text: 'Find answers to common questions and support info.' },
]

export default function AccountClient({ activeTab }) {
  const { user } = useAuth()

  const activeSection = useMemo(() => {
    return accountSections.find((item) => item.id === activeTab) || accountSections[0]
  }, [activeTab])

  return (
    <main style={{maxWidth:1120,margin:'0 auto',padding:'36px 20px 70px'}}>
      <h1 style={{fontSize:42,lineHeight:1.06,fontWeight:500,marginBottom:20}}>Profile</h1>
      {user && (
        <p style={{fontSize:15,color:'#575757',marginBottom:28}}>
          Signed in as {user.email}
        </p>
      )}

      <section style={{display:'grid',gridTemplateColumns:'minmax(240px,320px) minmax(0,1fr)',gap:22}}>
        <aside style={{border:'1px solid #e2e2e2',background:'#fafafa'}}>
          {accountSections.map((item) => {
            const isActive = item.id === activeSection.id
            return (
              <a
                key={item.id}
                href={item.id === 'overview' ? '/account' : `/account?tab=${item.id}`}
                style={{
                  display:'block',
                  padding:'15px 18px',
                  borderBottom:'1px solid #e6e6e6',
                  background:isActive ? '#efefef' : 'transparent',
                  fontWeight:isActive ? 600 : 500,
                  color:'#111',
                }}
              >
                {item.title}
              </a>
            )
          })}
        </aside>

        <article style={{border:'1px solid #e2e2e2',background:'#fff',padding:'24px 24px 28px',minHeight:260}}>
          <h2 style={{fontSize:30,lineHeight:1.1,fontWeight:500,marginBottom:12}}>{activeSection.title}</h2>
          <p style={{fontSize:16,lineHeight:1.6,color:'#333',maxWidth:620}}>{activeSection.text}</p>
          <p style={{marginTop:24,fontSize:14,color:'#5e5e5e'}}>
            This page is prepared as a base. Next, we can add real content, API integration,
            and detailed UI for each section.
          </p>
        </article>
      </section>
    </main>
  )
}
