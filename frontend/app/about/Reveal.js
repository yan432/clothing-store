'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Wraps a region so it fades + slides up into view the first time it crosses
 * the viewport threshold. Renders any element via the `as` prop.
 */
export default function Reveal({
  children,
  as: Tag = 'div',
  className,
  id,
  delay = 0,
  y = 24,
  duration = 700,
  threshold = 0.12,
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -6% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  const style = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : `translateY(${y}px)`,
    transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
    transitionDelay: visible ? `${delay}ms` : '0ms',
    willChange: 'opacity, transform',
  }

  return (
    <Tag ref={ref} className={className} id={id} style={style}>
      {children}
    </Tag>
  )
}
