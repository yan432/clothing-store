-- Atomic increment of promo_codes.used_count via PostgreSQL function.
-- This avoids the read-modify-write race condition in Python.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION increment_promo_used_count(promo_id INT)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.promo_codes
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = promo_id;
$$;
