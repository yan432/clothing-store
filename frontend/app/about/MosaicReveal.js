'use client'
import { useEffect, useRef, useState } from 'react'
import s from './page.module.css'

export default function MosaicReveal({ images, stagger = 95 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let cancelled = false
    let timer = 0
    let poll = 0
    let frame = 0
    let observer = null
    let started = false

    const stopWatching = () => {
      if (observer) observer.disconnect()
      observer = null
      window.removeEventListener('scroll', scheduleCheck)
      window.removeEventListener('resize', scheduleCheck)
      if (poll) clearInterval(poll)
      poll = 0
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }

    const start = () => {
      if (cancelled || started) return
      started = true
      stopWatching()

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = window.setTimeout(() => {
          if (!cancelled) setShown(images.length)
        }, 0)
        return
      }

      let i = 0
      const tick = () => {
        if (cancelled) return
        i += 1
        setShown(i)
        if (i < images.length) {
          const jitter = stagger + Math.round((Math.random() - 0.5) * 50)
          timer = window.setTimeout(tick, Math.max(40, jitter))
        }
      }
      timer = window.setTimeout(tick, 120)
    }

    const isInView = () => {
      const rect = el.getBoundingClientRect()
      return rect.top < window.innerHeight * 0.92
    }

    const check = () => {
      if (isInView()) start()
    }

    function scheduleCheck() {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        check()
      })
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) start()
        },
        { threshold: 0.15, rootMargin: '0px 0px 12% 0px' },
      )
      observer.observe(el)
    }

    window.addEventListener('scroll', scheduleCheck, { passive: true })
    window.addEventListener('resize', scheduleCheck)
    timer = window.setTimeout(scheduleCheck, 120)
    poll = window.setInterval(scheduleCheck, 180)
    scheduleCheck()

    return () => {
      cancelled = true
      stopWatching()
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
            willChange: i < shown ? 'auto' : 'opacity, transform',
          }}
        >
          <img src={img.src} alt={img.alt} loading="lazy" />
        </figure>
      ))}
    </div>
  )
}
