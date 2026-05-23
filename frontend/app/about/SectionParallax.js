'use client'
import { useEffect, useRef } from 'react'

/**
 * Drop this inside a `position: relative` section to give it a parallax
 * photo backdrop. The img sits absolute, 130% tall (15% overhang on each
 * side), and translates against scroll at a fraction of the section height
 * so the image always covers the section's bounds.
 */
export default function SectionParallax({ src, alt = '', strength = 0.22 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const section = el.parentElement
    if (!section) return

    let raf = 0

    function update() {
      raf = 0
      const rect = section.getBoundingClientRect()
      const winH = window.innerHeight
      if (rect.bottom < 0 || rect.top > winH) return
      // progress: 0 when section bottom just entered viewport (rect.top === winH),
      // 1 when section top just left (rect.bottom === 0).
      const progress = (winH - rect.top) / (winH + rect.height)
      const range = rect.height * strength
      const y = (0.5 - progress) * range
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength])

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '-15%',
        left: 0,
        width: '100%',
        height: '130%',
        objectFit: 'cover',
        objectPosition: 'center',
        willChange: 'transform',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
      }}
    />
  )
}
