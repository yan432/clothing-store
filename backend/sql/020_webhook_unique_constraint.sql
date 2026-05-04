-- Migration 020: Add UNIQUE constraint on stripe_webhook_events.event_id
--
-- Required for race-condition-safe webhook deduplication.
-- Without this constraint, concurrent Stripe deliveries of the same event
-- can both pass the SELECT check and both INSERT, causing:
--   - double stock decrements
--   - duplicate order confirmation emails
--   - double promo usage increments
--
-- Run once in Supabase SQL editor.

ALTER TABLE stripe_webhook_events
    ADD CONSTRAINT IF NOT EXISTS stripe_webhook_events_event_id_key
    UNIQUE (event_id);
