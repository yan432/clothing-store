-- ============================================================
-- Curated Instagram posts ("worn by you" wall under New Arrivals)
-- Run in Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS instagram_posts (
  id            BIGSERIAL PRIMARY KEY,
  image_url     TEXT NOT NULL,
  permalink     TEXT,
  caption       TEXT,
  author_handle TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instagram_posts_sort_idx
  ON instagram_posts (sort_order)
  WHERE is_active = TRUE;

ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read instagram posts" ON instagram_posts;
CREATE POLICY "Public read instagram posts"
  ON instagram_posts FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);
