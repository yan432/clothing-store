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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stripe_webhook_events_event_id_key'
    ) THEN
        ALTER TABLE stripe_webhook_events
            ADD CONSTRAINT stripe_webhook_events_event_id_key UNIQUE (event_id);
    END IF;
END$$;
