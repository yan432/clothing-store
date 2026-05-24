'use client'
import { useState } from 'react'
import Image from 'next/image'
import ShopTheLookDrawer from './ShopTheLookDrawer'

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )
}

export default function HomepagePhotoTiles({ tiles }) {
  const [activeTile, setActiveTile] = useState(null)

  if (!tiles || tiles.length === 0) return null

  function openDrawer(tile, e) {
    e.preventDefault()
    setActiveTile(tile)
  }

  return (
    <section className="photo-tiles-section">
      <div className="photo-tiles-grid">
        {tiles.map(tile => {
          const hasProducts = Array.isArray(tile.product_ids) && tile.product_ids.length > 0
          const inner = (
            <div className="photo-tile-inner">
              <Image
                src={tile.image_url}
                alt=""
                fill
                sizes="(max-width: 680px) 50vw, 25vw"
                className="photo-tile-img"
                loading="lazy"
                quality={60}
                style={{objectFit:'cover',objectPosition:'center top'}}
              />
              <div className="photo-tile-cart-btn" aria-hidden="true">
                <CartIcon />
              </div>
            </div>
          )
          if (hasProducts) {
            return (
              <button
                key={tile.id}
                type="button"
                className="photo-tile"
                aria-label="Shop this look"
                onClick={(e) => openDrawer(tile, e)}
                style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'block', textAlign: 'left' }}
              >
                {inner}
              </button>
            )
          }
          if (tile.href) {
            return <a key={tile.id} href={tile.href} className="photo-tile">{inner}</a>
          }
          return <div key={tile.id} className="photo-tile">{inner}</div>
        })}
      </div>

      <ShopTheLookDrawer
        open={Boolean(activeTile)}
        productIds={activeTile?.product_ids || []}
        shopHref={activeTile?.href || ''}
        onClose={() => setActiveTile(null)}
      />
    </section>
  )
}
