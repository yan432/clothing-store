-- Add optional link_label column to homepage_slides
-- link_label: custom button text (e.g. "Shop now", "See Collection")
-- If NULL, the carousel shows no button at all.
ALTER TABLE homepage_slides
  ADD COLUMN IF NOT EXISTS link_label TEXT;
