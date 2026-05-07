-- Homepage photo tiles: 4-up grid shown between countdown and carousel
CREATE TABLE IF NOT EXISTS homepage_photo_tiles (
  id         SERIAL PRIMARY KEY,
  image_url  TEXT NOT NULL,
  href       TEXT,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
