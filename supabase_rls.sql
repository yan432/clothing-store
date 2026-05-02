-- ============================================================
-- RLS (Row Level Security) — EDM Clothes
-- Run this entire file in Supabase → SQL Editor
--
-- Architecture:
--   Backend uses SERVICE ROLE KEY → bypasses RLS (trusted server)
--   Frontend anon key → subject to RLS (can only do auth, not table reads)
--   Direct table access from browser is blocked for all sensitive tables
-- ============================================================


-- ── 1. Enable RLS on every table ─────────────────────────────────────────────
ALTER TABLE IF EXISTS products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_size_stock     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_subscribers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promo_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homepage_slides        ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS pages               ENABLE ROW LEVEL SECURITY;  -- table does not exist yet
ALTER TABLE IF EXISTS stripe_webhook_events  ENABLE ROW LEVEL SECURITY;


-- ── 2. Drop any old/conflicting policies ─────────────────────────────────────
DROP POLICY IF EXISTS "Public read products"         ON products;
DROP POLICY IF EXISTS "Public read size stock"       ON product_size_stock;
DROP POLICY IF EXISTS "Public read settings"         ON settings;
DROP POLICY IF EXISTS "Public read homepage slides"  ON homepage_slides;
-- DROP POLICY IF EXISTS "Public read pages"         ON pages;  -- table does not exist yet
DROP POLICY IF EXISTS "Users read own profile"       ON user_profiles;
DROP POLICY IF EXISTS "Users insert own profile"     ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile"     ON user_profiles;


-- ── 3. Public READ-ONLY tables (storefront needs these) ──────────────────────

-- Products: anyone can read visible products (storefront)
CREATE POLICY "Public read products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (is_hidden = false);

-- Size stock: public (needed for product page FOMO badges)
CREATE POLICY "Public read size stock"
  ON product_size_stock FOR SELECT
  TO anon, authenticated
  USING (true);

-- Settings: public read (announcement bar, SEO, shipping config)
CREATE POLICY "Public read settings"
  ON settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Homepage slides: public read
CREATE POLICY "Public read homepage slides"
  ON homepage_slides FOR SELECT
  TO anon, authenticated
  USING (true);

-- Static pages (shipping, returns): public read
-- CREATE POLICY "Public read pages"           -- table does not exist yet
--   ON pages FOR SELECT
--   TO anon, authenticated
--   USING (true);


-- ── 4. User profiles: each user sees/edits only their own row ─────────────────
-- Adjust the user_id / email column names if yours differ.
-- Check your user_profiles table schema in Table Editor first.

CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.email() = email);

CREATE POLICY "Users insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = email);

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING  (auth.email() = email)
  WITH CHECK (auth.email() = email);


-- ── 5. Sensitive tables: NO anon/authenticated access ────────────────────────
-- orders, email_subscribers, promo_codes, stripe_webhook_events
-- have RLS enabled but zero policies for anon/authenticated.
-- Only the service role key (backend) can access them.
-- No CREATE POLICY needed — absence of policy = deny by default.


-- ── 6. Verify (run these SELECTs to confirm) ─────────────────────────────────
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;

-- SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
