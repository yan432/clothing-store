'use client'
import { useEffect, useRef, useState } from 'react'

export default function StatCounter({ value, suffix = '', duration = 1600 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    let timer = 0
    let poll = 0
    let cancelled = false
    let observer = null
    let started = false

    const stopWatching = () => {
      if (observer) observer.disconnect()
      observer = null
      window.removeEventListener('scroll', scheduleCheck)
      window.removeEventListener('resize', scheduleCheck)
      if (poll) clearInterval(poll)
      poll = 0
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const startCounter = () => {
      if (cancelled || started) return
      started = true
      stopWatching()

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = window.setTimeout(() => {
          if (!cancelled) setShown(value)
        }, 0)
        return
      }

      const start = performance.now()
      const tick = (now) => {
        if (cancelled) return
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setShown(Math.round(value * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const isInView = () => {
      const rect = el.getBoundingClientRect()
      return rect.top < window.innerHeight * 0.9
    }

    const check = () => {
      if (isInView()) startCounter()
    }

    function scheduleCheck() {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = 0
        check()
      })
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) startCounter()
        },
        { threshold: 0.2, rootMargin: '0px 0px 12% 0px' },
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
      if (raf) cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
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
