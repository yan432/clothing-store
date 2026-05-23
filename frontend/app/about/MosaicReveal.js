'use client'
import { useEffect, useRef, useState } from 'react'
import s from './page.module.css'

/**
 * Renders the visual-essay mosaic. The first time the grid scrolls into view
 * each figure appears in DOM order with a small staggered delay (plus tiny
 * random jitter so it feels organic rather than mechanical).
 */
export default function MosaicReveal({ images, stagger = 95 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(images.length)
      return
    }

    let timer = 0
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        let i = 0
        const tick = () => {
          i += 1
          setShown(i)
          if (i < images.length) {
            const jitter = stagger + Math.round((Math.random() - 0.5) * 50)
            timer = window.setTimeout(tick, Math.max(40, jitter))
          }
        }
        timer = window.setTimeout(tick, 120)
      },
      { threshold: 0.15 },
    )
    obs.observe(el)

    return () => {
      obs.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [images.length, stagger])

  return (
    <div ref={ref} className={s.mosaic}>
      {images.map((img, i) => (
        <figure
          key={img.src}
          className={s[img.cls]}
          style={{
            opacity: i < shown ? 1 : 0,
            transform: i < shown ? 'none' : 'translateY(22px) scale(0.97)',
            transition: 'opacity 0.55s ease-out, transform 0.6s ease-out',
            willChange: 'opacity, transform',
          }}
        >
          <img src={img.src} alt={img.alt} loading="lazy" />
        </figure>
      ))}
    </div>
  )
}
