-- 017: Waitlist table for back-in-stock notifications
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS waitlist (
  id          bigserial PRIMARY KEY,
  email       text        NOT NULL,
  product_id  bigint      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending', -- pending | fulfilled
  created_at  timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,

  -- Prevent duplicate entries for the same (email, product, size)
  UNIQUE (email, product_id, size)
);

CREATE INDEX IF NOT EXISTS waitlist_product_size_status
  ON waitlist (product_id, size, status);

-- RLS: service role only (backend manages all access)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
