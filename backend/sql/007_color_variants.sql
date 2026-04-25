-- Color variants: link products that are the same item in different colors
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_name TEXT;       -- e.g. "Black", "White", "Beige"
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_hex  TEXT;       -- e.g. "#1a1a1a", "#ffffff"
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_group_id TEXT;   -- same value on all variants of one design, e.g. "edm-module-longsleeve"
