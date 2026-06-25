import { tokens } from './tokens'

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: tokens.space.lg,
      marginBottom: 28,
      paddingBottom: 18,
      borderBottom: `1px solid ${tokens.color.borderStrong}`,
      flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={tokens.font.h1}>{title}</h1>
        {subtitle && (
          <p style={{ ...tokens.font.bodyMuted, margin: '8px 0 0', maxWidth: 680 }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: tokens.space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </header>
  )
}
