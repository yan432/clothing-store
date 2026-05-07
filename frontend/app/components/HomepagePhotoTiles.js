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
  if (!tiles || tiles.length === 0) return null

  return (
    <section className="photo-tiles-section">
      <div className="photo-tiles-grid">
        {tiles.map(tile => {
          const inner = (
            <div className="photo-tile-inner">
              <img
                src={tile.image_url}
                alt=""
                className="photo-tile-img"
                loading="lazy"
              />
              <div className="photo-tile-cart-btn" aria-hidden="true">
                <CartIcon />
              </div>
            </div>
          )
          return tile.href ? (
            <a key={tile.id} href={tile.href} className="photo-tile">
              {inner}
            </a>
          ) : (
            <div key={tile.id} className="photo-tile">
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}
