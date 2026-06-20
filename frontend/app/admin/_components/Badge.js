import { tokens } from './tokens'

const tones = {
  neutral: { bg: tokens.color.bg, border: tokens.color.border, text: tokens.color.text },
  success: { bg: tokens.color.successBg, border: tokens.color.successBorder, text: tokens.color.successText },
  warn: { bg: tokens.color.warnBg, border: tokens.color.warnBorder, text: tokens.color.warnText },
  danger: { bg: tokens.color.dangerBg, border: tokens.color.dangerBorder, text: tokens.color.dangerText },
  info: { bg: tokens.color.infoBg, border: tokens.color.infoBorder, text: tokens.color.infoText },
}

export default function Badge({ children, tone = 'neutral', style }) {
  const t = tones[tone] || tones.neutral
  return (
    <span
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.text,
        borderRadius: tokens.radius.pill,
        padding: '3px 9px',
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
