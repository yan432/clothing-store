-- User events table for marketing/ML tracking — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_events (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT,                        -- null for anonymous sessions
  session_id   TEXT NOT NULL,               -- browser cookie, links anon → user
  event_type   TEXT NOT NULL,               -- product_view | cart_add | checkout_started | purchase | login | wishlist_add
  product_id   INT,
  order_id     INT,
  metadata     JSONB    NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_email      ON user_events (email);
CREATE INDEX IF NOT EXISTS idx_user_events_session    ON user_events (session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type       ON user_events (event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created    ON user_events (created_at DESC);

-- Extend user_profiles with aggregate marketing fields
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_login_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_purchase_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_orders       INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent        NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_events       INT     NOT NULL DEFAULT 0;
