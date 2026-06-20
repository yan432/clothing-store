import { tokens } from './tokens'

export default function Card({ children, padding = tokens.space.xl, style, ...rest }) {
  return (
    <div
      style={{
        background: tokens.color.surface,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadow.card,
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
