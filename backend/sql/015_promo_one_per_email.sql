-- Add one_per_email flag to promo_codes.
-- When true, each customer email can only redeem this code once
-- (checked against paid/shipped/delivered orders).
-- Run in Supabase SQL Editor.

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS one_per_email BOOLEAN NOT NULL DEFAULT FALSE;
