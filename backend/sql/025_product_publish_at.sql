-- Scheduled auto-publish: stores the UTC datetime when a hidden product should go live.
-- A cron job polls this column and flips is_hidden=false when the time arrives.
ALTER TABLE products ADD COLUMN IF NOT EXISTS publish_at timestamptz;
