import { tokens } from './tokens'

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: tokens.space.lg,
      marginBottom: tokens.space.xl,
      paddingBottom: tokens.space.lg,
      borderBottom: `1px solid ${tokens.color.border}`,
    }}>
      <div>
        <h1 style={tokens.font.h1}>{title}</h1>
        {subtitle && (
          <p style={{ ...tokens.font.bodyMuted, margin: '6px 0 0' }}>{subtitle}</p>
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
