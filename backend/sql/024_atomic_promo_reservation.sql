-- Atomic promo usage reservation.
-- Run in Supabase SQL Editor before deploying the checkout code that calls it.
--
-- For limited promo codes, used_count represents active reservations plus paid
-- redemptions. Checkout reserves a use before creating the Stripe session, and
-- webhooks release it if the payment fails or expires.

CREATE OR REPLACE FUNCTION reserve_promo_usage(promo_id BIGINT)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.promo_codes
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = promo_id
    AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit);

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION release_promo_usage(promo_id BIGINT)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.promo_codes
  SET used_count = GREATEST(0, COALESCE(used_count, 0) - 1)
  WHERE id = promo_id;
$$;
