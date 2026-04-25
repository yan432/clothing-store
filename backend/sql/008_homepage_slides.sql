CREATE TABLE IF NOT EXISTS homepage_slides (
  id          SERIAL PRIMARY KEY,
  image_url   TEXT NOT NULL,
  href        TEXT NOT NULL DEFAULT '/products',
  title       TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
