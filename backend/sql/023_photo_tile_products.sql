-- Allow each photo tile to link to multiple products (Shop the Look)
ALTER TABLE homepage_photo_tiles
  ADD COLUMN IF NOT EXISTS product_ids JSONB DEFAULT '[]'::jsonb;
