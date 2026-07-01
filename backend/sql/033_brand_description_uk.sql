-- Ukrainian description for brand pages, mirroring products.description /
-- products.description_uk pattern. When null, the storefront falls back to
-- `description` (which the site treats as English).

alter table public.brands
  add column if not exists description_uk text;
