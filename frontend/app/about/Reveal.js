'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Reveals a region as it enters the viewport. The scroll/resize check backs up
 * IntersectionObserver so content never gets stuck hidden on slower hydration.
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

    let cancelled = false
    let frame = 0
    let timer = 0
    let poll = 0
    let observer = null

    const show = () => {
      if (!cancelled) setVisible(true)
    }

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

    const isInView = () => {
      const rect = el.getBoundingClientRect()
      return rect.top < window.innerHeight * 0.92
    }

    const check = () => {
      if (!isInView()) return
      stopWatching()
      show()
    }

    function scheduleCheck() {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        check()
      })
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = window.setTimeout(show, 0)
      return () => {
        cancelled = true
        if (timer) clearTimeout(timer)
      }
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          stopWatching()
          show()
        },
        { threshold, rootMargin: '0px 0px 12% 0px' },
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
  }, [threshold])

  const style = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : `translateY(${y}px)`,
    transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
    transitionDelay: visible ? `${delay}ms` : '0ms',
    willChange: visible ? 'auto' : 'opacity, transform',
  }

  return (
    <Tag ref={ref} className={className} id={id} style={style}>
      {children}
    </Tag>
  )
}
