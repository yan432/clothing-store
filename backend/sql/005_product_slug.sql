-- Add slug column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Auto-populate slugs for existing products based on their name
-- Converts name to lowercase, replaces spaces/special chars with hyphens
UPDATE products
SET slug = lower(regexp_replace(
    regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '[\s-]+', '-', 'g'
)) || '-' || id
WHERE slug IS NULL;
