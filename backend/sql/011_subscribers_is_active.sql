-- Add is_active to email_subscribers (run in Supabase SQL Editor)
ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
