-- 019: Wishlist (favourites) table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wishlists (
  id          bigserial    PRIMARY KEY,
  email       text         NOT NULL,
  product_id  bigint       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (email, product_id)
);

CREATE INDEX IF NOT EXISTS wishlists_email      ON wishlists (email);
CREATE INDEX IF NOT EXISTS wishlists_product_id ON wishlists (product_id);

-- RLS: service role only
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
