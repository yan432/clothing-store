'use client'
import { useEffect, useRef, useState } from 'react'

export default function StatCounter({ value, suffix = '', duration = 1600 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let animFrame = 0
    let checkFrame = 0
    let resetTimer = 0
    let checkTimer = 0
    let readyTimer = 0
    let poll = 0
    let cancelled = false
    let observer = null
    let started = false

    const isReached = () => {
      const rect = el.getBoundingClientRect()
      return rect.top < window.innerHeight * 0.9
    }

    const stopWatching = () => {
      if (observer) observer.disconnect()
      observer = null
      window.removeEventListener('scroll', scheduleCheck)
      window.removeEventListener('resize', scheduleCheck)
      if (poll) clearInterval(poll)
      poll = 0
      if (checkTimer) clearTimeout(checkTimer)
      checkTimer = 0
      if (readyTimer) clearTimeout(readyTimer)
      readyTimer = 0
      if (checkFrame) cancelAnimationFrame(checkFrame)
      checkFrame = 0
    }

    const showFinal = () => {
      if (readyTimer) clearTimeout(readyTimer)
      readyTimer = window.setTimeout(() => {
        if (cancelled) return
        setShown(value)
        setReady(true)
      }, 0)
    }

    const startCounter = () => {
      if (cancelled || started) return
      started = true
      stopWatching()
      if (resetTimer) clearTimeout(resetTimer)

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        showFinal()
        return
      }

      const start = performance.now()
      const tick = (now) => {
        if (cancelled) return
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setShown(Math.round(value * eased))
        if (t < 1) {
          animFrame = requestAnimationFrame(tick)
        } else {
          setShown(value)
        }
      }
      setShown(0)
      setReady(true)
      animFrame = requestAnimationFrame(tick)
    }

    const check = () => {
      if (isReached()) startCounter()
    }

    function scheduleCheck() {
      if (checkFrame) cancelAnimationFrame(checkFrame)
      checkFrame = requestAnimationFrame(() => {
        checkFrame = 0
        check()
      })
    }

    if (isReached()) {
      showFinal()
      return () => {
        cancelled = true
        if (readyTimer) clearTimeout(readyTimer)
      }
    }

    resetTimer = window.setTimeout(() => {
      if (!cancelled && !started) {
        setShown(0)
        setReady(true)
      }
    }, 0)

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
    checkTimer = window.setTimeout(scheduleCheck, 120)
    poll = window.setInterval(scheduleCheck, 180)
    scheduleCheck()

    return () => {
      cancelled = true
      stopWatching()
      if (animFrame) cancelAnimationFrame(animFrame)
      if (resetTimer) clearTimeout(resetTimer)
      if (checkTimer) clearTimeout(checkTimer)
      if (readyTimer) clearTimeout(readyTimer)
    }
  }, [value, duration])

  return (
    <span ref={ref} style={{ visibility: ready ? 'visible' : 'hidden' }}>
      {shown}
      {suffix && (
        <span style={{ fontSize: '0.45em', letterSpacing: '0.05em', verticalAlign: 'middle' }}>
          {suffix}
        </span>
      )}
    </span>
  )
}
