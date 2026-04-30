-- 018: Abandoned cart recovery table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id          bigserial    PRIMARY KEY,
  email       text         NOT NULL,
  first_name  text,
  items_json  jsonb        NOT NULL DEFAULT '[]',
  total_eur   numeric(10,2),
  status      text         NOT NULL DEFAULT 'pending',
  -- pending   = cart captured, no email sent yet
  -- emailed   = recovery email sent, still not converted
  -- converted = order placed after recovery
  -- completed = order placed (no recovery email needed)
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  emailed_at  timestamptz,

  -- One active cart per email — on conflict update cart contents & reset timer
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS abandoned_carts_status_created
  ON abandoned_carts (status, created_at);

-- RLS: backend service role only
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
