'use client'
import { useEffect, useRef, useState } from 'react'

export default function StatCounter({ value, suffix = '', duration = 1600 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }

    let raf = 0
    let cancelled = false

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        const start = performance.now()
        const tick = (now) => {
          if (cancelled) return
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - t, 3)
          setShown(Math.round(value * eased))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.45 },
    )
    obs.observe(el)

    return () => {
      cancelled = true
      obs.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref}>
      {shown}
      {suffix && (
        <span style={{ fontSize: '0.45em', letterSpacing: '0.05em', verticalAlign: 'middle' }}>
          {suffix}
        </span>
      )}
    </span>
  )
}
