'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { getMessages } from '../lib/i18n'

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function HomeInstagramFeed({ posts, locale = 'en' }) {
  const d = getMessages(locale)
  const trackRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    function update() {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [posts])

  if (!posts || posts.length === 0) return null

  function scroll(dir) {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <section className="ig-feed-section" aria-labelledby="ig-feed-h">
      <div className="ig-feed-head">
        <div>
          <p className="ig-feed-kicker">{d.home.wornByYou}</p>
          <h2 id="ig-feed-h" className="ig-feed-h">{d.home.community}</h2>
        </div>
        <a href="https://www.instagram.com/edm.clothes" target="_blank" rel="noopener noreferrer" className="ig-feed-follow">
          <InstagramIcon />
          <span>@edm.clothes</span>
        </a>
      </div>

      <div className="ig-feed-wrap">
        <button
          type="button"
          className="ig-feed-arrow ig-feed-arrow-left"
          aria-label={d.home.scrollLeft}
          onClick={() => scroll(-1)}
          disabled={!canLeft}
        >‹</button>
        <button
          type="button"
          className="ig-feed-arrow ig-feed-arrow-right"
          aria-label={d.home.scrollRight}
          onClick={() => scroll(1)}
          disabled={!canRight}
        >›</button>

        <div ref={trackRef} className="ig-feed-track">
          {posts.map(post => {
            const handle = post.author_handle ? `@${post.author_handle}` : null
            const inner = (
              <>
                <Image
                  src={post.image_url}
                  alt={post.caption || d.home.instagramPost}
                  fill
                  sizes="(max-width: 679px) 70vw, (max-width: 1099px) 33vw, 260px"
                  quality={45}
                  className="ig-feed-img"
                  loading="lazy"
                  style={{ objectFit: 'cover' }}
                />
                <div className="ig-feed-overlay" aria-hidden="true">
                  <InstagramIcon />
                  {handle && <span className="ig-feed-handle">{handle}</span>}
                </div>
              </>
            )
            if (post.permalink) {
              return (
                <a
                  key={post.id}
                  className="ig-feed-tile"
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={handle ? `${d.home.instagramBy} ${handle}` : d.home.instagramPost}
                >
                  {inner}
                </a>
              )
            }
            return <div key={post.id} className="ig-feed-tile">{inner}</div>
          })}
        </div>
      </div>
    </section>
  )
}
