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
