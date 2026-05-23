'use client'
import { useEffect, useRef } from 'react'

export default function CoverParallax({ src, alt }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let lastY = window.scrollY

    function update() {
      raf = 0
      el.style.transform = `translate3d(0, ${lastY * 0.35}px, 0)`
    }

    function onScroll() {
      lastY = window.scrollY
      if (lastY > 1500) return
      if (!raf) raf = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      style={{
        width: '100%',
        height: '120%',
        objectFit: 'cover',
        objectPosition: 'center top',
        willChange: 'transform',
      }}
    />
  )
}
