-- User profile data (shipping info) — run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS user_profiles (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  zip         TEXT,
  country     TEXT DEFAULT 'DE',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
