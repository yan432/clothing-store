import { tokens } from './tokens'

const variants = {
  primary: {
    background: tokens.color.accent,
    color: tokens.color.accentText,
    border: `1px solid ${tokens.color.accent}`,
  },
  secondary: {
    background: tokens.color.surface,
    color: tokens.color.text,
    border: `1px solid ${tokens.color.borderStrong}`,
  },
  ghost: {
    background: 'transparent',
    color: tokens.color.text,
    border: `1px solid ${tokens.color.border}`,
  },
  danger: {
    background: tokens.color.dangerBg,
    color: tokens.color.dangerText,
    border: `1px solid ${tokens.color.dangerBorder}`,
  },
}

const sizes = {
  sm: { padding: '6px 10px', fontSize: 12, borderRadius: tokens.radius.sm },
  md: { padding: '8px 14px', fontSize: 13, borderRadius: tokens.radius.sm },
  lg: { padding: '10px 18px', fontSize: 14, borderRadius: tokens.radius.md },
}

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  disabled,
  style,
  ...rest
}) {
  return (
    <button
      disabled={disabled}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontWeight: 500,
        transition: 'opacity 120ms ease',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
