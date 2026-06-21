import PartnerShell from './PartnerShell'

export const metadata = {
  title: 'Partner cabinet',
}

export default function PartnerLayout({ children }) {
  return <PartnerShell>{children}</PartnerShell>
}
