'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function HomeAboutTeaser() {
  const sectionRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const img = imgRef.current
    if (!section || !img) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(max-width: 768px)').matches) return

    let raf = 0
    let visible = false

    function update() {
      raf = 0
      if (!visible) return
      const rect = section.getBoundingClientRect()
      const center = rect.top + rect.height / 2 - window.innerHeight / 2
      const offset = -center * 0.18
      img.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) update()
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(section)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section ref={sectionRef} className="home-about-teaser" aria-labelledby="home-about-h">
      <div className="home-about-photo">
        <img
          ref={imgRef}
          src="/about/cover-hero.jpg"
          alt=""
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      </div>
      <div className="home-about-overlay" aria-hidden="true" />
      <div className="home-about-inner">
        <p className="home-about-kicker">The story</p>
        <h2 id="home-about-h" className="home-about-h">
          Learn more <em>about us.</em>
        </h2>
        <p className="home-about-sub">
          edm.clothes began as an upcycling project — long before it became a movement.
          Six years of chapters, re-stitched garments, and work that gets to age and survive
          the year it was made in.
        </p>
        <Link href="/about" className="home-about-cta">Read our story →</Link>
      </div>
    </section>
  )
}
